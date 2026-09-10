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
}
