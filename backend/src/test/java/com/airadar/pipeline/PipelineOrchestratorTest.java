package com.airadar.pipeline;

import com.airadar.config.RadarProperties;
import com.airadar.connector.ConnectorRegistry;
import com.airadar.connector.FixtureConnector;
import com.airadar.domain.ItemStatus;
import com.airadar.domain.NewsItem;
import com.airadar.domain.SourceType;
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
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PipelineOrchestratorTest {

    @TempDir
    Path tempDir;

    private SourceRepository sourceRepository;
    private NewsItemRepository newsItemRepository;
    private AiService aiService;
    private EventClusterService eventClusterService;
    private PipelineOrchestrator orchestrator;

    @BeforeEach
    void setUp() throws Exception {
        Path fixtureFile = tempDir.resolve("fixture.json");
        Files.writeString(fixtureFile, """
                [
                  {
                    "title": "Open source LLM agent toolkit",
                    "url": "https://example.com/llm-agent",
                    "content": "A new open-source agent framework for LLM inference.",
                    "publishedAt": "2026-09-01T00:00:00Z"
                  }
                ]
                """);

        sourceRepository = mock(SourceRepository.class);
        newsItemRepository = mock(NewsItemRepository.class);
        aiService = mock(AiService.class);
        eventClusterService = mock(EventClusterService.class);
        WebContentFetcher webContentFetcher = mock(WebContentFetcher.class);
        when(webContentFetcher.isEnabled()).thenReturn(false);

        TransactionTemplate transactionTemplate = new TransactionTemplate(new org.springframework.transaction.PlatformTransactionManager() {
            @Override
            public org.springframework.transaction.TransactionStatus getTransaction(TransactionDefinition definition)
                    throws TransactionException {
                return new SimpleTransactionStatus();
            }

            @Override
            public void commit(org.springframework.transaction.TransactionStatus status) throws TransactionException {
            }

            @Override
            public void rollback(org.springframework.transaction.TransactionStatus status) throws TransactionException {
            }
        });

        RadarProperties properties = new RadarProperties();
        properties.setBriefsDir(tempDir.resolve("briefs").toString());
        properties.setScoreThreshold(50);
        properties.setMaxItems(10);
        properties.setAiBatchSize(8);
        properties.setLookbackHours(48);

        ObjectMapper mapper = new ObjectMapper();
        EntityMapper entityMapper = new EntityMapper(mapper);
        FixtureConnector fixtureConnector = new FixtureConnector(mapper);
        ConnectorRegistry registry = new ConnectorRegistry(List.of(fixtureConnector));
        UrlDedupStage dedup = new UrlDedupStage(newsItemRepository, entityMapper);

        SourceEntity source = new SourceEntity();
        source.setId(1L);
        source.setName("Demo Fixture");
        source.setType(SourceType.FIXTURE);
        source.setEnabled(true);
        source.setConfigJson("{\"path\":" + mapper.writeValueAsString(fixtureFile.toString()) + "}");
        when(sourceRepository.findByEnabledTrue()).thenReturn(List.of(source));
        when(sourceRepository.findById(1L)).thenReturn(Optional.of(source));
        when(newsItemRepository.findByCanonicalUrlIn(anyCollection())).thenReturn(List.of());
        when(newsItemRepository.saveAll(anyList())).thenAnswer(inv -> {
            List<NewsItemEntity> list = inv.getArgument(0);
            long id = 1;
            for (NewsItemEntity e : list) {
                e.setId(id++);
            }
            return list;
        });
        when(newsItemRepository.save(org.mockito.ArgumentMatchers.any(NewsItemEntity.class))).thenAnswer(inv -> {
            NewsItemEntity e = inv.getArgument(0);
            if (e.getId() == null) {
                e.setId(1L);
            }
            return e;
        });

        when(aiService.score(anyList())).thenAnswer(inv -> {
            List<NewsItem> items = inv.getArgument(0);
            return items.stream()
                    .map(i -> new ScoreResult(80, "test", List.of("ai"), "ai"))
                    .toList();
        });
        when(aiService.summarizeDetailed(org.mockito.ArgumentMatchers.any(NewsItem.class))).thenAnswer(inv -> {
            NewsItem item = inv.getArgument(0);
            return new SummarizeResult("Summary of " + item.getTitle(), item.getTitle());
        });
        when(aiService.summarizeDetailedBatch(anyList())).thenAnswer(inv -> {
            List<NewsItem> items = inv.getArgument(0);
            return items.stream()
                    .map(i -> new SummarizeResult("Summary of " + i.getTitle(), i.getTitle()))
                    .toList();
        });

        orchestrator = new PipelineOrchestrator(
                sourceRepository,
                newsItemRepository,
                entityMapper,
                registry,
                dedup,
                aiService,
                properties,
                Executors.newFixedThreadPool(2),
                eventClusterService,
                new FetchProgress(),
                webContentFetcher,
                transactionTemplate,
                mock(AiCallMonitor.class)
        );
    }

    @Test
    void runFetchesScoresSummarizesAndPersists() {
        PipelineResult result = orchestrator.run(new PipelineRequest(null, null, null));

        assertEquals(1, result.fetched());
        assertEquals(1, result.kept());
        assertTrue(result.briefPath().contains("briefs"));
        verify(aiService).score(anyList());
        verify(aiService, atLeastOnce()).summarizeDetailed(org.mockito.ArgumentMatchers.any(NewsItem.class));
        verify(newsItemRepository, atLeastOnce()).save(org.mockito.ArgumentMatchers.any(NewsItemEntity.class));
        verify(sourceRepository).touchLastFetchedAt(anyCollection(), org.mockito.ArgumentMatchers.any());
        verify(eventClusterService, atLeastOnce()).linkNewItems(anyList());
        assertEquals(ItemStatus.DONE, result.topItems().getFirst().getStatus());
        assertTrue(result.topItems().getFirst().getSummary().startsWith("Summary of"));
    }

    @Test
    void skipsSummarizeWhenDbAlreadyHasSummary() {
        NewsItemEntity existing = new NewsItemEntity();
        existing.setId(42L);
        existing.setCanonicalUrl("https://example.com/llm-agent");
        existing.setTitle("Open source LLM agent toolkit");
        existing.setTitleDisplay("开源 LLM Agent 工具包");
        existing.setSummary("Already translated summary.");
        existing.setScore(80.0);
        existing.setScoreReason("prior");
        existing.setStatus(ItemStatus.DONE);
        when(newsItemRepository.findByCanonicalUrlIn(anyCollection())).thenReturn(List.of(existing));

        PipelineResult result = orchestrator.run(new PipelineRequest(null, null, null));

        assertEquals(1, result.kept());
        assertEquals("Already translated summary.", result.topItems().getFirst().getSummary());
        assertEquals("开源 LLM Agent 工具包", result.topItems().getFirst().getTitleDisplay());
        verify(aiService, never()).summarizeDetailed(org.mockito.ArgumentMatchers.any(NewsItem.class));
        verify(aiService, never()).score(anyList());
        verify(newsItemRepository, atLeastOnce()).save(org.mockito.ArgumentMatchers.any(NewsItemEntity.class));
    }
}
