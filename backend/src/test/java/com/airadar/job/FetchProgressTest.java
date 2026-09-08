package com.airadar.job;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FetchProgressTest {

    @Test
    void tracksParallelSourcesAndTotals() {
        FetchProgress progress = new FetchProgress();
        progress.begin(List.of(
                new FetchProgress.SourceSeed(1, "HN", "HACKER_NEWS"),
                new FetchProgress.SourceSeed(2, "RSS", "RSS")
        ));

        progress.markSourceRunning(1);
        Map<String, Object> mid = progress.snapshot();
        assertTrue((Boolean) mid.get("running"));
        assertEquals("fetch", mid.get("stage"));
        @SuppressWarnings("unchecked")
        Map<String, Object> totals = (Map<String, Object>) mid.get("totals");
        assertEquals(2, totals.get("total"));
        assertEquals(1, totals.get("running"));
        assertEquals(2, totals.get("remaining")); // pending + running

        progress.markSourceDone(1, 10, 120);
        progress.markSourceRunning(2);
        progress.markSourceError(2, "timeout", 50);
        progress.setStage(FetchProgress.Stage.score);
        progress.complete(Map.of("fetched", 10, "kept", 3));

        Map<String, Object> done = progress.snapshot();
        assertFalse((Boolean) done.get("running"));
        assertEquals("done", done.get("stage"));
        @SuppressWarnings("unchecked")
        Map<String, Object> doneTotals = (Map<String, Object>) done.get("totals");
        assertEquals(2, doneTotals.get("done"));
        assertEquals(0, doneTotals.get("remaining"));
    }
}
