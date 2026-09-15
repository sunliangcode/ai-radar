package com.airadar.provider.ai;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiHealthTrackerTest {

    @Test
    void startsHealthyAndReportsSuccess() {
        AiHealthTracker tracker = new AiHealthTracker();
        assertTrue(tracker.isHealthy());

        tracker.recordSuccess();
        Map<String, Object> map = tracker.toMap();
        assertEquals(Boolean.TRUE, map.get("ok"));
        assertEquals(1L, map.get("successCount"));
        assertNull(map.get("lastError"));
    }

    @Test
    void surfacesLastFailureUntilRecovery() {
        AiHealthTracker tracker = new AiHealthTracker();
        tracker.recordFailure("score", "ConnectException: Connection refused");

        assertFalse(tracker.isHealthy());
        Map<String, Object> failed = tracker.toMap();
        assertEquals(Boolean.FALSE, failed.get("ok"));
        assertEquals("ConnectException: Connection refused", failed.get("lastError"));
        assertEquals("score", failed.get("lastErrorOp"));

        // A later success must clear the stale error so the UI stops showing a red row.
        tracker.recordSuccess();
        assertTrue(tracker.isHealthy());
        assertNull(tracker.toMap().get("lastError"));
        assertEquals(1L, tracker.toMap().get("failureCount"));
    }

    @Test
    void blankFailureReasonIsNotReportedAsNull() {
        AiHealthTracker tracker = new AiHealthTracker();
        tracker.recordFailure("summarize", "  ");
        assertEquals("unknown error", tracker.toMap().get("lastError"));
    }

    @Test
    void recentFailureTripsTheCooldownButSuccessClearsIt() {
        AiHealthTracker tracker = new AiHealthTracker();
        assertFalse(tracker.isRecentlyFailing(60_000), "healthy tracker must not skip calls");

        tracker.recordFailure("score", "ConnectException: Connection refused");
        assertTrue(tracker.isRecentlyFailing(60_000), "a fresh failure should skip further live calls");
        assertFalse(tracker.isRecentlyFailing(0), "cooldown 0 means always retry the model");

        // Recovery must be immediate, otherwise starting Ollama would appear to do nothing.
        tracker.recordSuccess();
        assertFalse(tracker.isRecentlyFailing(60_000));
    }
}
