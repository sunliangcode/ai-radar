package com.airadar.connector;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class CliInstallProgressTest {

    @Test
    void tracksPhaseUntilCleared() {
        CliInstallProgress progress = new CliInstallProgress();
        progress.start("bili");
        progress.phase("bili", "clone", "git clone");
        CliInstallProgress.Snapshot snap = progress.get("bili");
        assertEquals("clone", snap.phase());
        assertEquals("git clone", snap.message());
        progress.clear("bili");
        assertNull(progress.get("bili"));
    }
}
