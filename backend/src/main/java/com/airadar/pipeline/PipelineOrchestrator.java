package com.airadar.pipeline;

import com.airadar.config.RadarProperties;
import com.airadar.connector.ConnectorRegistry;
import com.airadar.connector.SourceConnector;
import com.airadar.domain.FetchContext;
import com.airadar.domain.ItemStatus;
import com.airadar.domain.NewsItem;
import com.airadar.domain.RawItem;
import com.airadar.domain.Source;
import com.airadar.event.EventClusterService;
import com.airadar.job.FetchProgress;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.persistence.SourceEntity;
import com.airadar.persistence.SourceRepository;
import com.airadar.provider.ai.AiService;
import com.airadar.provider.ai.ScoreResult;
import com.airadar.provider.webfetch.WebContentFetcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class PipelineOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(PipelineOrchestrator.class);

    private final SourceRepository sourceRepository;
    private final NewsItemRepository newsItemRepository;
    private final EntityMapper entityMapper;
    private final ConnectorRegistry connectorRegistry;
    private final UrlDedupStage urlDedupStage;
    private final AiService aiService;
    private final RadarProperties properties;
    private final ExecutorService fetchExecutor;
    private final EventClusterService eventClusterService;
    private final FetchProgress fetchProgress;
    private final WebContentFetcher webContentFetcher;
    private final TransactionTemplate transactionTemplate;

    public PipelineOrchestrator(
            SourceRepository sourceRepository,
            NewsItemRepository newsItemRepository,
            EntityMapper entityMapper,
            ConnectorRegistry connectorRegistry,
            UrlDedupStage urlDedupStage,
            AiService aiService,
            RadarProperties properties,
            ExecutorService fetchExecutor,
            EventClusterService eventClusterService,
            FetchProgress fetchProgress,
            WebContentFetcher webContentFetcher,
            TransactionTemplate transactionTemplate
    ) {
        this.sourceRepository = sourceRepository;
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
        this.connectorRegistry = connectorRegistry;
        this.urlDedupStage = urlDedupStage;
        this.aiService = aiService;
        this.properties = properties;
        this.fetchExecutor = fetchExecutor;
        this.eventClusterService = eventClusterService;
        this.fetchProgress = fetchProgress;
        this.webContentFetcher = webContentFetcher;
        this.transactionTemplate = transactionTemplate;
    }

    /**
     * Runs the full pipeline without a single long DB transaction.
     * Network I/O and LLM calls stay outside TX; persist uses a short transactional boundary.
     */
    public PipelineResult run(PipelineRequest request) {
        long started = System.currentTimeMillis();
        int lookbackHours = request.lookbackHours() != null ? request.lookbackHours() : properties.getLookbackHours();
        int maxItems = request.maxItems() != null ? request.maxItems() : properties.getMaxItems();
        int scoreThreshold = request.scoreThreshold() != null ? request.scoreThreshold() : properties.getScoreThreshold();
        Instant since = Instant.now().minus(lookbackHours, ChronoUnit.HOURS);

        fetchProgress.setStage(FetchProgress.Stage.fetch);
        List<RawItem> fetched = fetchAll(since, lookbackHours);
        long tFetch = System.currentTimeMillis();
        log.info("pipeline_stage=fetch count={} durationMs={}", fetched.size(), tFetch - started);

        fetchProgress.setStage(FetchProgress.Stage.normalize);
        List<NewsItem> normalized = NormalizeStage.normalize(fetched, properties);
        enrichFullText(normalized);
        long tNorm = System.currentTimeMillis();
        log.info("pipeline_stage=normalize count={} durationMs={}", normalized.size(), tNorm - tFetch);

        fetchProgress.setStage(FetchProgress.Stage.dedup);
        List<NewsItem> deduped = urlDedupStage.dedup(normalized, properties.getDedupLookbackDays());
        long tDedup = System.currentTimeMillis();
        log.info("pipeline_stage=dedup count={} durationMs={}", deduped.size(), tDedup - tNorm);

        List<NewsItem> toScore = deduped.stream()
                .filter(i -> i.getScore() == null || i.getStatus() == ItemStatus.NEW || i.getStatus() == ItemStatus.ERROR)
                .toList();
        fetchProgress.setStage(FetchProgress.Stage.score);
        fetchProgress.setMessage("scoring " + toScore.size() + " items");
        scoreItems(toScore);
        long tScore = System.currentTimeMillis();
        log.info("pipeline_stage=score count={} durationMs={}", toScore.size(), tScore - tDedup);

        List<NewsItem> kept = deduped.stream()
                .filter(i -> i.getScore() != null && i.getScore() >= scoreThreshold)
                .sorted(Comparator.comparing(NewsItem::getScore, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(maxItems)
                .toList();
        long tFilter = System.currentTimeMillis();
        log.info("pipeline_stage=filter kept={} threshold={} durationMs={}", kept.size(), scoreThreshold, tFilter - tScore);

        fetchProgress.setStage(FetchProgress.Stage.summarize);
        fetchProgress.setMessage("summarizing " + kept.size() + " items");
        summarizeItems(kept);
        long tSummary = System.currentTimeMillis();
        log.info("pipeline_stage=summary count={} durationMs={}", kept.size(), tSummary - tFilter);

        fetchProgress.setStage(FetchProgress.Stage.persist);
        persistAll(deduped);
        try {
            fetchProgress.setStage(FetchProgress.Stage.cluster);
            eventClusterService.linkNewItems(kept.stream().filter(i -> i.getId() != null).toList());
            eventClusterService.linkNewItems(deduped.stream()
                    .filter(i -> i.getId() != null && i.getStatus() == ItemStatus.DONE)
                    .toList());
        } catch (Exception e) {
            log.warn("pipeline_cluster_skipped error={}", e.getMessage());
        }
        Path briefPath;
        try {
            fetchProgress.setStage(FetchProgress.Stage.brief);
            LocalDate day = LocalDate.now(ZoneOffset.UTC);
            briefPath = BriefWriter.write(Path.of(properties.getBriefsDir()), day, kept);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to write brief: " + e.getMessage(), e);
        }
        long duration = System.currentTimeMillis() - started;
        log.info("pipeline_done fetched={} deduped={} scored={} kept={} durationMs={} brief={}",
                fetched.size(), deduped.size(), toScore.size(), kept.size(), duration, briefPath);

        return new PipelineResult(
                fetched.size(),
                deduped.size(),
                toScore.size(),
                kept.size(),
                briefPath.toString(),
                kept,
                duration
        );
    }

    private List<RawItem> fetchAll(Instant since, int lookbackHours) {
        List<SourceEntity> sources = sourceRepository.findByEnabledTrue();
        List<FetchProgress.SourceSeed> seeds = new ArrayList<>();
        for (SourceEntity entity : sources) {
            if (connectorRegistry.get(entity.getType().name()) == null) {
                log.warn("No connector for source type {}", entity.getType());
                continue;
            }
            seeds.add(new FetchProgress.SourceSeed(entity.getId(), entity.getName(), entity.getType().name()));
        }
        fetchProgress.begin(seeds);

        if (sources.isEmpty() || seeds.isEmpty()) {
            return List.of();
        }

        List<CompletableFuture<SourceFetchOutcome>> futures = new ArrayList<>();
        for (SourceEntity entity : sources) {
            SourceConnector connector = connectorRegistry.get(entity.getType().name());
            if (connector == null) {
                continue;
            }
            Source source = entityMapper.toDomain(entity);
            FetchContext ctx = new FetchContext(since, lookbackHours, source);
            Long sourceId = entity.getId();
            String sourceName = entity.getName();
            String sourceType = entity.getType().name();
            futures.add(CompletableFuture.supplyAsync(() -> {
                long t0 = System.currentTimeMillis();
                fetchProgress.markSourceRunning(sourceId);
                try {
                    List<RawItem> items = connector.fetch(ctx);
                    long durationMs = System.currentTimeMillis() - t0;
                    fetchProgress.markSourceDone(sourceId, items.size(), durationMs);
                    log.info("source_fetch name={} type={} count={}", sourceName, sourceType, items.size());
                    return new SourceFetchOutcome(sourceId, items, null);
                } catch (Exception e) {
                    long durationMs = System.currentTimeMillis() - t0;
                    fetchProgress.markSourceError(sourceId, e.getMessage(), durationMs);
                    log.error("source_fetch_failed name={} type={} error={}", sourceName, sourceType, e.getMessage());
                    return new SourceFetchOutcome(sourceId, List.of(), e.getMessage());
                }
            }, fetchExecutor));
        }

        CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new)).join();

        List<RawItem> all = new ArrayList<>();
        List<Long> succeededIds = new ArrayList<>();
        for (CompletableFuture<SourceFetchOutcome> future : futures) {
            SourceFetchOutcome outcome = future.join();
            all.addAll(outcome.items());
            if (outcome.error() == null) {
                succeededIds.add(outcome.sourceId());
            }
        }
        touchSourcesFetched(succeededIds);
        return all;
    }

    private void touchSourcesFetched(List<Long> sourceIds) {
        if (sourceIds == null || sourceIds.isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        transactionTemplate.executeWithoutResult(status -> {
            for (Long id : sourceIds) {
                sourceRepository.findById(id).ifPresent(entity -> {
                    entity.setLastFetchedAt(now);
                    sourceRepository.save(entity);
                });
            }
        });
    }

    private void enrichFullText(List<NewsItem> items) {
        if (!webContentFetcher.isEnabled() || items == null || items.isEmpty()) {
            return;
        }
        List<NewsItem> needsFetch = new ArrayList<>();
        for (NewsItem item : items) {
            String snippet = item.getContentSnippet();
            boolean needs = snippet == null || snippet.length() < 80;
            Map<String, Object> meta = item.getRawMeta();
            if (meta != null && Boolean.TRUE.equals(meta.get("needsFullText"))) {
                needs = true;
            }
            if (needs) {
                needsFetch.add(item);
            }
        }
        if (needsFetch.isEmpty()) {
            return;
        }

        int parallelism = Math.max(1, properties.getWebFetch().getParallelism());
        Semaphore gate = new Semaphore(parallelism);
        AtomicInteger enriched = new AtomicInteger();
        int maxSnippet = properties.getMaxSnippetChars();

        List<CompletableFuture<Void>> futures = new ArrayList<>();
        for (NewsItem item : needsFetch) {
            futures.add(CompletableFuture.runAsync(() -> {
                try {
                    gate.acquire();
                    try {
                        String text = webContentFetcher.fetchArticleText(item.getCanonicalUrl());
                        if (text == null || text.isBlank()) {
                            return;
                        }
                        item.setContentSnippet(text.length() > maxSnippet
                                ? text.substring(0, maxSnippet)
                                : text);
                        enriched.incrementAndGet();
                    } finally {
                        gate.release();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception e) {
                    log.debug("web_fetch_skip url={} error={}", item.getCanonicalUrl(), e.getMessage());
                }
            }, fetchExecutor));
        }
        CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new)).join();
        if (enriched.get() > 0) {
            log.info("pipeline_stage=web_fetch enriched={} parallelism={}", enriched.get(), parallelism);
        }
    }

    private void scoreItems(List<NewsItem> items) {
        int batchSize = Math.max(1, properties.getAiBatchSize());
        for (int i = 0; i < items.size(); i += batchSize) {
            List<NewsItem> batch = items.subList(i, Math.min(i + batchSize, items.size()));
            for (NewsItem item : batch) {
                item.setStatus(ItemStatus.SCORING);
            }
            try {
                List<ScoreResult> results = aiService.score(batch);
                for (int j = 0; j < batch.size(); j++) {
                    NewsItem item = batch.get(j);
                    ScoreResult result = j < results.size()
                            ? results.get(j)
                            : new ScoreResult(0, "missing", List.of(), "other");
                    item.setScore(result.score());
                    item.setScoreReason(result.reason());
                    item.setTags(result.tags());
                    item.setCategory(result.category());
                    item.setStatus(ItemStatus.DONE);
                    item.setUpdatedAt(Instant.now());
                }
            } catch (Exception e) {
                log.error("ai_score_batch_failed size={} error={}", batch.size(), e.getMessage());
                for (NewsItem item : batch) {
                    item.setStatus(ItemStatus.ERROR);
                    item.setScore(0.0);
                    item.setScoreReason("scoring failed: " + e.getMessage());
                    item.setUpdatedAt(Instant.now());
                }
            }
        }
    }

    private void summarizeItems(List<NewsItem> items) {
        List<NewsItem> needSummary = items.stream()
                .filter(i -> i.getSummary() == null || i.getSummary().isBlank())
                .toList();
        if (needSummary.isEmpty()) {
            return;
        }
        int batchSize = Math.max(1, properties.getAiBatchSize());
        for (int i = 0; i < needSummary.size(); i += batchSize) {
            List<NewsItem> batch = needSummary.subList(i, Math.min(i + batchSize, needSummary.size()));
            try {
                List<String> summaries = aiService.summarizeBatch(batch);
                for (int j = 0; j < batch.size(); j++) {
                    NewsItem item = batch.get(j);
                    String summary = j < summaries.size() ? summaries.get(j) : null;
                    if (summary == null || summary.isBlank()) {
                        summary = item.getScoreReason() != null ? item.getScoreReason() : "";
                    }
                    item.setSummary(summary);
                    item.setUpdatedAt(Instant.now());
                }
            } catch (Exception e) {
                log.error("ai_summary_batch_failed size={} error={}", batch.size(), e.getMessage());
                for (NewsItem item : batch) {
                    try {
                        item.setSummary(aiService.summarize(item));
                    } catch (Exception ex) {
                        item.setSummary(item.getScoreReason() != null ? item.getScoreReason() : "");
                    }
                    item.setUpdatedAt(Instant.now());
                }
            }
        }
    }

    private void persistAll(List<NewsItem> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        transactionTemplate.executeWithoutResult(status -> {
            List<String> urls = items.stream()
                    .map(NewsItem::getCanonicalUrl)
                    .filter(u -> u != null && !u.isBlank())
                    .distinct()
                    .toList();
            Map<String, NewsItemEntity> existing = new HashMap<>();
            if (!urls.isEmpty()) {
                for (NewsItemEntity entity : newsItemRepository.findByCanonicalUrlIn(urls)) {
                    existing.put(entity.getCanonicalUrl(), entity);
                }
            }
            List<NewsItemEntity> toSave = new ArrayList<>(items.size());
            for (NewsItem item : items) {
                NewsItemEntity entity = existing.getOrDefault(item.getCanonicalUrl(), new NewsItemEntity());
                entityMapper.applyToEntity(item, entity);
                toSave.add(entity);
            }
            List<NewsItemEntity> saved = newsItemRepository.saveAll(toSave);
            for (int i = 0; i < items.size(); i++) {
                items.get(i).setId(saved.get(i).getId());
            }
        });
    }

    private record SourceFetchOutcome(Long sourceId, List<RawItem> items, String error) {
    }
}
