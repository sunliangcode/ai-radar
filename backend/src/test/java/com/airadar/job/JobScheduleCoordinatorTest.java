package com.airadar.job;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JobScheduleCoordinatorTest {

    @Test
    void firstRunUsesInitialDelay() {
        Instant now = Instant.now();
        Instant next = JobScheduleCoordinator.nextRunAt(null, 7_200_000L, 60_000L);
        long deltaMs = next.toEpochMilli() - now.toEpochMilli();
        assertTrue(deltaMs >= 55_000L && deltaMs <= 65_000L, "expected ~60s initial delay, got " + deltaMs);
    }

    @Test
    void subsequentRunWaitsFullIntervalAfterLastCompletion() {
        Instant last = Instant.now().minus(1, ChronoUnit.MINUTES);
        Instant next = JobScheduleCoordinator.nextRunAt(last, 7_200_000L, 60_000L);
        long expected = last.plusMillis(7_200_000L).toEpochMilli();
        assertTrue(Math.abs(next.toEpochMilli() - expected) <= 2_000L,
                "expected last+interval, got " + next);
    }

    @Test
    void overdueRunFiresImmediately() {
        Instant last = Instant.now().minus(3, ChronoUnit.HOURS);
        Instant next = JobScheduleCoordinator.nextRunAt(last, 3_600_000L, 60_000L);
        assertFalse(next.isAfter(Instant.now().plusSeconds(1)));
    }

    @Test
    void zeroInitialDelaySchedulesNow() {
        Instant next = JobScheduleCoordinator.nextRunAt(null, 1_000L, 0L);
        assertTrue(next.toEpochMilli() - Instant.now().toEpochMilli() <= 1_000L);
    }
}
