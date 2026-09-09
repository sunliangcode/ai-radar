package com.airadar.change;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ChangeServiceTest {

    @Test
    void inferChangeType_pricing() {
        assertEquals("pricing", ChangeService.inferChangeType("OpenAI cuts API price", null, null));
    }

    @Test
    void inferChangeType_modelCapability() {
        assertEquals("model_capability", ChangeService.inferChangeType("GPT-5 benchmark SOTA", "new capability", null));
    }

    @Test
    void inferChangeType_newTech() {
        assertEquals("new_tech", ChangeService.inferChangeType("Acme announces new framework", "released today", null));
    }

    @Test
    void inferChangeType_unknown() {
        assertEquals("unknown", ChangeService.inferChangeType("Weekly newsletter roundup", "misc notes", null));
    }
}
