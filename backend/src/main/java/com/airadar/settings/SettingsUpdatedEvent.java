package com.airadar.settings;

import org.springframework.context.ApplicationEvent;

/** Fired after DB-backed settings are applied to in-process {@code RadarProperties}. */
public class SettingsUpdatedEvent extends ApplicationEvent {

    public SettingsUpdatedEvent(Object source) {
        super(source);
    }
}
