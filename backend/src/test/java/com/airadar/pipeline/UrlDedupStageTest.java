package com.airadar.pipeline;

import com.airadar.domain.ItemStatus;
import com.airadar.domain.NewsItem;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UrlDedupStageTest {

    @Test
    void mergesAiFieldsEvenWhenOutsideLookbackWindow() {
        NewsItemRepository repo = mock(NewsItemRepository.class);
        EntityMapper mapper = new EntityMapper(new ObjectMapper());
        UrlDedupStage stage = new UrlDedupStage(repo, mapper);

        NewsItemEntity entity = new NewsItemEntity();
        entity.setId(9L);
        entity.setCanonicalUrl("https://example.com/old");
        entity.setTitle("Old title");
        entity.setTitleDisplay("旧标题");
        entity.setSummary("Persisted summary");
        entity.setScore(90.0);
        entity.setStatus(ItemStatus.DONE);
        when(repo.findByCanonicalUrlIn(anyCollection())).thenReturn(List.of(entity));
        when(repo.findByTitleIn(anyCollection())).thenReturn(List.of());

        NewsItem incoming = new NewsItem();
        incoming.setCanonicalUrl("https://example.com/old");
        incoming.setTitle("Old title");
        incoming.setContentSnippet("fresh snippet from feed");

        List<NewsItem> result = stage.dedup(List.of(incoming), 7);

        assertEquals(1, result.size());
        assertEquals("Persisted summary", result.getFirst().getSummary());
        assertEquals("旧标题", result.getFirst().getTitleDisplay());
        assertEquals(90.0, result.getFirst().getScore());
        assertEquals(ItemStatus.DONE, result.getFirst().getStatus());
        assertEquals(9L, result.getFirst().getId());
    }

    @Test
    void discardsSameTitleWithinBatch() {
        NewsItemRepository repo = mock(NewsItemRepository.class);
        EntityMapper mapper = new EntityMapper(new ObjectMapper());
        UrlDedupStage stage = new UrlDedupStage(repo, mapper);
        when(repo.findByCanonicalUrlIn(anyCollection())).thenReturn(List.of());
        when(repo.findByTitleIn(anyCollection())).thenReturn(List.of());

        NewsItem a = new NewsItem();
        a.setCanonicalUrl("https://example.com/a");
        a.setTitle("Same Headline");
        NewsItem b = new NewsItem();
        b.setCanonicalUrl("https://example.com/b");
        b.setTitle("Same Headline");

        List<NewsItem> result = stage.dedup(List.of(a, b), 7);

        assertEquals(1, result.size());
        assertEquals("https://example.com/a", result.getFirst().getCanonicalUrl());
    }

    @Test
    void discardsNewItemWhenTitleAlreadyInDb() {
        NewsItemRepository repo = mock(NewsItemRepository.class);
        EntityMapper mapper = new EntityMapper(new ObjectMapper());
        UrlDedupStage stage = new UrlDedupStage(repo, mapper);
        when(repo.findByCanonicalUrlIn(anyCollection())).thenReturn(List.of());

        NewsItemEntity existing = new NewsItemEntity();
        existing.setId(3L);
        existing.setCanonicalUrl("https://example.com/old");
        existing.setTitle("Same Headline");
        when(repo.findByTitleIn(anyCollection())).thenReturn(List.of(existing));

        NewsItem incoming = new NewsItem();
        incoming.setCanonicalUrl("https://example.com/new");
        incoming.setTitle("Same Headline");

        List<NewsItem> result = stage.dedup(List.of(incoming), 7);

        assertTrue(result.isEmpty());
    }

    @Test
    void keepsUrlHitEvenWhenTitleMatchesDb() {
        NewsItemRepository repo = mock(NewsItemRepository.class);
        EntityMapper mapper = new EntityMapper(new ObjectMapper());
        UrlDedupStage stage = new UrlDedupStage(repo, mapper);

        NewsItemEntity entity = new NewsItemEntity();
        entity.setId(9L);
        entity.setCanonicalUrl("https://example.com/old");
        entity.setTitle("Same Headline");
        entity.setSummary("kept");
        when(repo.findByCanonicalUrlIn(anyCollection())).thenReturn(List.of(entity));
        when(repo.findByTitleIn(anyCollection())).thenReturn(List.of(entity));

        NewsItem incoming = new NewsItem();
        incoming.setCanonicalUrl("https://example.com/old");
        incoming.setTitle("Same Headline");

        List<NewsItem> result = stage.dedup(List.of(incoming), 7);

        assertEquals(1, result.size());
        assertEquals(9L, result.getFirst().getId());
        assertEquals("kept", result.getFirst().getSummary());
    }

    @Test
    void doesNotDedupUrlFallbackTitle() {
        NewsItemRepository repo = mock(NewsItemRepository.class);
        EntityMapper mapper = new EntityMapper(new ObjectMapper());
        UrlDedupStage stage = new UrlDedupStage(repo, mapper);
        when(repo.findByCanonicalUrlIn(anyCollection())).thenReturn(List.of());
        when(repo.findByTitleIn(anyCollection())).thenReturn(List.of());

        NewsItem a = new NewsItem();
        a.setCanonicalUrl("https://example.com/a");
        a.setTitle("https://example.com/a");
        NewsItem b = new NewsItem();
        b.setCanonicalUrl("https://example.com/b");
        b.setTitle("https://example.com/b");

        List<NewsItem> result = stage.dedup(List.of(a, b), 7);

        assertEquals(2, result.size());
    }
}
