package com.airadar.settings;

import com.airadar.config.RadarProperties;
import com.airadar.persistence.AppSettingsEntity;
import com.airadar.persistence.AppSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SettingsServiceRetentionTest {

    @Mock AppSettingsRepository repository;
    @Mock ApplicationEventPublisher events;

    RadarProperties properties;
    SettingsService settingsService;

    @BeforeEach
    void setUp() {
        properties = new RadarProperties();
        settingsService = new SettingsService(properties, repository, events);
    }

    @Test
    void update_persistsRetentionDays() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        when(repository.save(any(AppSettingsEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        settingsService.update(Map.of("retentionDays", 90));

        ArgumentCaptor<AppSettingsEntity> cap = ArgumentCaptor.forClass(AppSettingsEntity.class);
        verify(repository).save(cap.capture());
        assertEquals(90, cap.getValue().getRetentionDays());
    }

    @Test
    void update_rejectsNegativeRetentionDays() {
        assertThrows(IllegalArgumentException.class, () -> settingsService.update(Map.of("retentionDays", -1)));
    }
}
