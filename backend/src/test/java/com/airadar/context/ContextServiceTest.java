package com.airadar.context;

import com.airadar.preference.PreferenceKeywordService;
import com.airadar.provider.ai.AiService;
import com.airadar.settings.SettingsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ContextServiceTest {

    private ContextRepository repository;
    private SettingsService settingsService;
    private PreferenceKeywordService preferenceKeywordService;
    private ContextService service;

    @BeforeEach
    void setUp() {
        repository = mock(ContextRepository.class);
        AiService aiService = mock(AiService.class);
        settingsService = mock(SettingsService.class);
        preferenceKeywordService = mock(PreferenceKeywordService.class);
        when(repository.findById(1L)).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(settingsService.update(anyMap())).thenReturn(Map.of());

        service = new ContextService(
                repository,
                aiService,
                settingsService,
                preferenceKeywordService,
                new ObjectMapper(),
                RestClient.builder()
        );
    }

    @Test
    void saveSyncsInterestFromRoleFocusInterestsAndTech() {
        service.save(Map.of(
                "payload", Map.of(
                        "profile", Map.of("role", "Java 工程师"),
                        "current_focus", List.of("WMS"),
                        "interests", List.of("开源模型"),
                        "technologies", List.of("Spring Boot", "MySQL"),
                        "explicit_ignore", List.of()
                ),
                "rawText", "hi",
                "source", "manual"
        ));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(settingsService).update(captor.capture());
        String profile = String.valueOf(captor.getValue().get("interestProfile"));
        assertTrue(profile.contains("Java 工程师"));
        assertTrue(profile.contains("WMS"));
        assertTrue(profile.contains("开源模型"));
        assertTrue(profile.contains("Spring Boot"));
        assertTrue(profile.contains("MySQL"));
    }

    @Test
    void saveSyncsExplicitIgnoreToContextDislikes() {
        service.save(Map.of(
                "payload", Map.of(
                        "profile", Map.of("role", "dev"),
                        "technologies", List.of("Java"),
                        "explicit_ignore", List.of("加密货币", "体育")
                ),
                "source", "manual"
        ));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<String>> captor = ArgumentCaptor.forClass(List.class);
        verify(preferenceKeywordService).replaceContextDislikes(captor.capture());
        assertTrue(captor.getValue().contains("加密货币"));
        assertTrue(captor.getValue().contains("体育"));
    }
}
