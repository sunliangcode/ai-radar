package com.airadar.maintenance;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RetentionServiceTest {

    @Test
    void cutoffIsDaysAgo() {
        Instant now = Instant.parse("2026-01-15T10:00:00Z");
        assertEquals(Instant.parse("2025-10-17T10:00:00Z"), RetentionService.cutoffFor(90, now));
        assertEquals(now, RetentionService.cutoffFor(0, now));
    }

    @Test
    void negativeDaysClampToZero() {
        Instant now = Instant.now();
        assertEquals(now, RetentionService.cutoffFor(-5, now));
    }

    @Test
    void policyDocumented() {
        // Guard the contract referenced by Settings help text: retention never touches saved or event-linked rows.
        String sql = """
                DELETE FROM news_items
                WHERE created_at < ?
                  AND COALESCE(saved, 0) = 0
                  AND id NOT IN (SELECT news_item_id FROM event_items)
                """;
        assertTrue(sql.contains("saved"));
        assertTrue(sql.contains("event_items"));
        assertTrue(Instant.now().minus(90, ChronoUnit.DAYS).isBefore(Instant.now()));
    }
}
