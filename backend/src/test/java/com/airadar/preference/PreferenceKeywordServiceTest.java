package com.airadar.preference;

import com.airadar.interest.InterestSignalsService;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.provider.ai.AiService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.concurrent.ExecutorService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PreferenceKeywordServiceTest {

    @Test
    void replaceContextDislikesDropsOldContextRowsAndInsertsFresh() {
        PreferenceKeywordRepository repository = mock(PreferenceKeywordRepository.class);
        InterestSignalsService signals = mock(InterestSignalsService.class);
        PreferenceKeywordEntity old = new PreferenceKeywordEntity();
        old.setKind(PreferenceKeywordService.KIND_DISLIKE);
        old.setText("旧主题");
        old.setSource(PreferenceKeywordService.SOURCE_CONTEXT);
        when(repository.findByKindAndSource(
                PreferenceKeywordService.KIND_DISLIKE,
                PreferenceKeywordService.SOURCE_CONTEXT
        )).thenReturn(List.of(old));
        when(repository.existsByKindAndTextIgnoreCase(any(), any())).thenReturn(false);
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PreferenceKeywordService service = new PreferenceKeywordService(
                repository,
                mock(NewsItemRepository.class),
                mock(AiService.class),
                mock(ExecutorService.class),
                signals
        );

        service.replaceContextDislikes(List.of("加密货币", " 体育 "));

        verify(repository).deleteAll(List.of(old));
        ArgumentCaptor<PreferenceKeywordEntity> saved = ArgumentCaptor.forClass(PreferenceKeywordEntity.class);
        verify(repository, org.mockito.Mockito.times(2)).save(saved.capture());
        List<PreferenceKeywordEntity> rows = saved.getAllValues();
        assertEquals("加密货币", rows.get(0).getText());
        assertEquals(PreferenceKeywordService.SOURCE_CONTEXT, rows.get(0).getSource());
        assertEquals("体育", rows.get(1).getText());
        verify(signals).invalidate();
    }

    @Test
    void replaceContextDislikesSkipsDuplicatesFromOtherSources() {
        PreferenceKeywordRepository repository = mock(PreferenceKeywordRepository.class);
        InterestSignalsService signals = mock(InterestSignalsService.class);
        when(repository.findByKindAndSource(
                PreferenceKeywordService.KIND_DISLIKE,
                PreferenceKeywordService.SOURCE_CONTEXT
        )).thenReturn(List.of());
        when(repository.existsByKindAndTextIgnoreCase(
                PreferenceKeywordService.KIND_DISLIKE, "crypto"
        )).thenReturn(true);

        PreferenceKeywordService service = new PreferenceKeywordService(
                repository,
                mock(NewsItemRepository.class),
                mock(AiService.class),
                mock(ExecutorService.class),
                signals
        );

        service.replaceContextDislikes(List.of("crypto"));

        verify(repository, never()).save(any());
        verify(signals).invalidate();
    }
}
