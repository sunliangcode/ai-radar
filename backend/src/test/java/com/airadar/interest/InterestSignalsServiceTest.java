package com.airadar.interest;

import com.airadar.config.RadarProperties;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InterestSignalsServiceTest {

    @Test
    void extractsLatinAndProfileTokensFromSavedTitles() {
        RadarProperties props = new RadarProperties();
        props.setInterestProfile("开源模型");
        NewsItemEntity a = new NewsItemEntity();
        a.setTitle("OpenAI 发布 GPT Agent 推理工具");
        a.setSaved(true);
        NewsItemRepository repo = mock(NewsItemRepository.class);
        when(repo.findBySavedTrue()).thenReturn(List.of(a));

        InterestSignalsService service = new InterestSignalsService(props, repo);
        List<String> kws = service.keywordsFromSaved();
        assertTrue(kws.stream().anyMatch(k -> k.equalsIgnoreCase("OpenAI")));
        assertTrue(kws.stream().anyMatch(k -> k.equalsIgnoreCase("GPT")));
        assertTrue(kws.stream().anyMatch(k -> k.equalsIgnoreCase("Agent")));

        String effective = service.effectiveInterestProfile();
        assertTrue(effective.contains("开源模型"));
        assertTrue(effective.toLowerCase().contains("openai"));
    }
}
