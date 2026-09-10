package com.airadar.interest;

import com.airadar.config.RadarProperties;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.preference.PreferenceKeywordRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
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
        PreferenceKeywordRepository prefRepo = mock(PreferenceKeywordRepository.class);
        when(prefRepo.findByKindOrderByCreatedAtDesc("like")).thenReturn(List.of());
        when(prefRepo.findByKindOrderByCreatedAtDesc("dislike")).thenReturn(List.of());

        InterestSignalsService service = new InterestSignalsService(props, repo, prefRepo);
        List<String> kws = service.keywordsFromSaved();
        assertTrue(kws.stream().anyMatch(k -> k.equalsIgnoreCase("OpenAI")));
        assertTrue(kws.stream().anyMatch(k -> k.equalsIgnoreCase("GPT")));
        assertTrue(kws.stream().anyMatch(k -> k.equalsIgnoreCase("Agent")));

        String effective = service.effectiveInterestProfile();
        assertTrue(effective.contains("开源模型"));
        assertTrue(effective.toLowerCase().contains("openai"));
    }

    @Test
    void cachesProfileUntilInvalidated() {
        RadarProperties props = new RadarProperties();
        props.setInterestProfile("base");
        NewsItemEntity a = new NewsItemEntity();
        a.setTitle("OpenAI Agent");
        a.setSaved(true);
        NewsItemRepository repo = mock(NewsItemRepository.class);
        when(repo.findBySavedTrue()).thenReturn(List.of(a));
        PreferenceKeywordRepository prefRepo = mock(PreferenceKeywordRepository.class);
        when(prefRepo.findByKindOrderByCreatedAtDesc("like")).thenReturn(List.of());
        when(prefRepo.findByKindOrderByCreatedAtDesc("dislike")).thenReturn(List.of());

        InterestSignalsService service = new InterestSignalsService(props, repo, prefRepo);
        String first = service.effectiveInterestProfile();
        String second = service.effectiveInterestProfile();
        assertTrue(first.equals(second));
        verify(repo, times(1)).findBySavedTrue();

        service.invalidate();
        service.effectiveInterestProfile();
        verify(repo, times(2)).findBySavedTrue();
    }
}
