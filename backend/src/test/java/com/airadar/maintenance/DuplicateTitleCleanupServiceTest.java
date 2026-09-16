package com.airadar.maintenance;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DuplicateTitleCleanupServiceTest {

    @Test
    void prefersSavedOverHigherScore() {
        var keeper = DuplicateTitleCleanupService.pickKeeper(List.of(
                new DuplicateTitleCleanupService.Row(1L, false, 99.0, "s", "d"),
                new DuplicateTitleCleanupService.Row(2L, true, 10.0, null, null)
        ));
        assertEquals(2L, keeper.id());
    }

    @Test
    void prefersHigherScoreWhenNeitherSaved() {
        var keeper = DuplicateTitleCleanupService.pickKeeper(List.of(
                new DuplicateTitleCleanupService.Row(1L, false, 40.0, "s", null),
                new DuplicateTitleCleanupService.Row(2L, false, 80.0, null, null)
        ));
        assertEquals(2L, keeper.id());
    }

    @Test
    void prefersSummaryThenDisplayThenOlderId() {
        var withSummary = DuplicateTitleCleanupService.pickKeeper(List.of(
                new DuplicateTitleCleanupService.Row(2L, false, null, null, "display"),
                new DuplicateTitleCleanupService.Row(1L, false, null, "summary", null)
        ));
        assertEquals(1L, withSummary.id());

        var withDisplay = DuplicateTitleCleanupService.pickKeeper(List.of(
                new DuplicateTitleCleanupService.Row(2L, false, null, null, null),
                new DuplicateTitleCleanupService.Row(3L, false, null, null, "d")
        ));
        assertEquals(3L, withDisplay.id());

        var older = DuplicateTitleCleanupService.pickKeeper(List.of(
                new DuplicateTitleCleanupService.Row(5L, false, null, null, null),
                new DuplicateTitleCleanupService.Row(2L, false, null, null, null)
        ));
        assertEquals(2L, older.id());
    }
}
