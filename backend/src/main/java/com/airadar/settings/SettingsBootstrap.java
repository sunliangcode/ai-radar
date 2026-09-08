package com.airadar.settings;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class SettingsBootstrap {

    private final SettingsService settingsService;

    public SettingsBootstrap(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @PostConstruct
    public void apply() {
        settingsService.applyLiveOverrides(settingsService.effective());
    }
}
