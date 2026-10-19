package com.airadar.config;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OpenApiConfigTest {

    @Test
    void buildsInfoFromRadarApiVersion() {
        RadarProperties props = new RadarProperties();
        props.getApi().setVersion("0.1.0");
        OpenAPI api = new OpenApiConfig().aiRadarOpenApi(props);
        assertEquals("0.1.0", api.getInfo().getVersion());
        assertEquals("AI Radar API", api.getInfo().getTitle());
        assertEquals("MIT", api.getInfo().getLicense().getName());
        assertNotNull(api.getInfo().getContact());
        assertTrue(api.getInfo().getContact().getUrl().contains("ai-radar"));
        assertNotNull(api.getExternalDocs());
        assertTrue(api.getExternalDocs().getUrl().contains("docs/api.md"));
        assertFalse(api.getServers().isEmpty());
        assertEquals("http://127.0.0.1:8080", api.getServers().get(0).getUrl());
        assertTrue(api.getInfo().getDescription().contains("Health"));
        assertTrue(api.getInfo().getDescription().contains("/api/health/llm"));
        assertTrue(api.getInfo().getDescription().contains("modelPresent"));
        assertTrue(api.getInfo().getDescription().contains("/api/connectors"));
        assertTrue(api.getInfo().getDescription().contains("/api/delivery/channels"));
        assertTrue(api.getInfo().getDescription().contains("typeCode"));
        assertTrue(api.getInfo().getDescription().contains("sorted case-insensitive"));
        assertTrue(api.getInfo().getDescription().contains(SpiCatalogBlurbs.CONNECTOR_EXPECT));
        assertTrue(api.getInfo().getDescription().contains(SpiCatalogBlurbs.DELIVERY_EXPECT));
    }
}
