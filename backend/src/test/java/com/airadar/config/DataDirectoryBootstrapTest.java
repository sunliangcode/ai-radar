package com.airadar.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

class DataDirectoryBootstrapTest {

    @TempDir
    Path tempDir;

    @Test
    void createsParentForFileUrlWithWalQuery() {
        Path db = tempDir.resolve("nested/data/radar.db");
        String url = "jdbc:sqlite:file:" + db + "?journal_mode=WAL&busy_timeout=30000";
        DataDirectoryBootstrap.ensureDirectories(url, tempDir.resolve("briefs").toString());
        assertTrue(Files.isDirectory(db.getParent()));
        assertTrue(Files.isDirectory(tempDir.resolve("briefs")));
    }
}
