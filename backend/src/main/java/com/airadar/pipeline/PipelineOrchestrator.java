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
import com.airadar.provider.ai.AiCallMonitor;
import com.airadar.provider.ai.AiService;
import com.airadar.provider.ai.ScoreResult;
import com.airadar.provider.ai.SummarizeResult;
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
    private final AiCallMonitor aiCallMonitor;

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
            TransactionTemplate transactionTemplate,
            AiCallMonitor aiCallMonitor
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
        this.aiCallMonitor = aiCallMonitor;
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
        List<RawItem> fetched = fetchAll(since, lookbackHours, request.sourceType());
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

        java.util.Set<NewsItem> keptSet = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        keptSet.addAll(kept);

        fetchProgress.setStage(FetchProgress.Stage.summarize);
        summarizeAndPersistIncremental(deduped, keptSet);
        long tSummary = System.currentTimeMillis();
        log.info("pipeline_stage=summary_persist count={} durationMs={}", deduped.size(), tSummary - tFilter);

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

    private List<RawItem> fetchAll(Instant since, int lookbackHours, String sourceTypeFilter) {
        List<SourceEntity> sources = sourceRepository.findByEnabledTrue();
        if (sourceTypeFilter != null && !sourceTypeFilter.isBlank()) {
            String wanted = sourceTypeFilter.trim().toUpperCase();
            sources = sources.stream()
                    .filter(s -> s.getType() != null && wanted.equals(s.getType().name()))
                    .toList();
        }
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
        transactionTemplate.executeWithoutResult(status ->
                sourceRepository.touchLastFetchedAt(sourceIds, now));
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
        if (items == null || items.isEmpty()) {
            return;
        }
        int batchSize = Math.max(1, properties.getAiBatchSize());
        List<List<NewsItem>> batches = new ArrayList<>();
        for (int i = 0; i < items.size(); i += batchSize) {
            batches.add(items.subList(i, Math.min(i + batchSize, items.size())));
        }
        fetchProgress.beginAnalysisQueue(items.size(), 1, 1);
        fetchProgress.setMessage("scoring 0/" + items.size());
        pushAnalysisQueue();
        // LLM is single-threaded: score batches sequentially.
        for (List<NewsItem> batch : batches) {
            if (!batch.isEmpty()) {
                fetchProgress.markItemAnalyzing(batch.get(0).getTitle());
                pushAnalysisQueue();
            }
            scoreBatch(batch);
            for (NewsItem item : batch) {
                fetchProgress.markItemDone(item.getTitle());
            }
            pushAnalysisQueue();
        }
    }

    private void scoreBatch(List<NewsItem> batch) {
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

    private void summarizeAndPersistIncremental(List<NewsItem> items, java.util.Set<NewsItem> kept) {
        if (items == null || items.isEmpty()) {
            return;
        }

        // Resolve already-translated rows from DB up front so queue total is accurate and we skip LLM.
        List<NewsItem> needTranslate = new ArrayList<>();
        for (NewsItem item : items) {
            if (needsAiTranslate(item, kept)) {
                needTranslate.add(item);
            }
        }

        fetchProgress.beginAnalysisQueue(needTranslate.size(), 1, 1);
        fetchProgress.setMessage("translating 0/" + needTranslate.size());
        pushAnalysisQueue();

        java.util.Set<NewsItem> needSet = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        needSet.addAll(needTranslate);

        // LLM is single-threaded: process one item at a time.
        for (NewsItem item : items) {
            boolean translating = needSet.contains(item);
            if (translating) {
                fetchProgress.markItemAnalyzing(item.getTitle());
                pushAnalysisQueue();
                try {
                    SummarizeResult result = aiService.summarizeDetailed(item);
                    item.setSummary(result.summary());
                    if (result.titleDisplay() != null && !result.titleDisplay().isBlank()) {
                        item.setTitleDisplay(result.titleDisplay());
                    }
                } catch (Exception e) {
                    log.warn("ai_summary_item_failed title={} error={}", item.getTitle(), e.getMessage());
                    item.setSummary(fallbackSummary(item));
                }
            } else if (item.getSummary() == null || item.getSummary().isBlank()) {
                item.setSummary(fallbackSummary(item));
            }
            item.setUpdatedAt(Instant.now());
            persistOne(item);
            if (translating) {
                fetchProgress.markItemPersisted(item.getId(), item.getTitle());
                pushAnalysisQueue();
            }
        }
        log.info("pipeline_stage=incremental_persist count={} translated={}", items.size(), needTranslate.size());
    }

    /**
     * True when this kept item still needs an LLM summarize/translate call.
     * Hydrates summary/titleDisplay from DB when present so repeats are skipped.
     */
    private boolean needsAiTranslate(NewsItem item, java.util.Set<NewsItem> kept) {
        if (item == null || !kept.contains(item)) {
            return false;
        }
        if (item.getSummary() != null && !item.getSummary().isBlank()) {
            return false;
        }
        String url = item.getCanonicalUrl();
        if (url == null || url.isBlank()) {
            return true;
        }
        return newsItemRepository.findByCanonicalUrlIn(List.of(url)).stream()
                .findFirst()
                .map(entity -> {
                    String existingSummary = entity.getSummary();
                    if (existingSummary != null && !existingSummary.isBlank()) {
                        item.setSummary(existingSummary);
                        if (entity.getTitleDisplay() != null && !entity.getTitleDisplay().isBlank()) {
                            item.setTitleDisplay(entity.getTitleDisplay());
                        }
                        if (item.getId() == null) {
                            item.setId(entity.getId());
                        }
                        return false;
                    }
                    return true;
                })
                .orElse(true);
    }

    private void pushAnalysisQueue() {
        Object analysis = fetchProgress.snapshot().get("analysis");
        if (analysis instanceof Map<?, ?> m) {
            @SuppressWarnings("unchecked")
            Map<String, Object> queue = (Map<String, Object>) m;
            aiCallMonitor.setQueue(queue);
        }
    }

    private static String fallbackSummary(NewsItem item) {
        String snippet = item.getContentSnippet();
        if (snippet != null && !snippet.isBlank()) {
            String trimmed = snippet.trim();
            // One-sentence style fallback: first ~120 chars
            if (trimmed.length() <= 120) {
                return trimmed;
            }
            return trimmed.substring(0, 120) + "…";
        }
        return item.getScoreReason() != null ? item.getScoreReason() : "";
    }

    private void persistOne(NewsItem item) {
        if (item == null || item.getCanonicalUrl() == null || item.getCanonicalUrl().isBlank()) {
            return;
        }
        transactionTemplate.executeWithoutResult(status -> {
            NewsItemEntity entity = newsItemRepository.findByCanonicalUrlIn(List.of(item.getCanonicalUrl()))
                    .stream()
                    .findFirst()
                    .orElseGet(NewsItemEntity::new);
            // Preserve user flags on update
            boolean prevRead = entity.getId() != null && entity.isReadFlag();
            boolean prevSaved = entity.getId() != null && entity.isSaved();
            boolean prevDismissed = entity.getId() != null && entity.isDismissed();
            entityMapper.applyToEntity(item, entity);
            if (entity.getId() != null) {
                entity.setReadFlag(prevRead || item.isRead());
                entity.setSaved(prevSaved || item.isSaved());
                entity.setDismissed(prevDismissed || item.isDismissed());
            }
            NewsItemEntity saved = newsItemRepository.save(entity);
            item.setId(saved.getId());
        });
    }

    private record SourceFetchOutcome(Long sourceId, List<RawItem> items, String error) {
    }
}
