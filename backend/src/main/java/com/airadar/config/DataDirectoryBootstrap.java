package com.airadar.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

/**
 * SQLite JDBC refuses to open a file when its parent directory is missing.
 * Create data dirs before Flyway / Hikari try to connect.
 */
public final class DataDirectoryBootstrap {

    private static final Logger log = LoggerFactory.getLogger(DataDirectoryBootstrap.class);

    private DataDirectoryBootstrap() {
    }

    public static void ensureDirectories(String jdbcUrl, String briefsDir) {
        ensureParentOfSqliteUrl(jdbcUrl);
        ensureDir(Path.of(briefsDir != null && !briefsDir.isBlank() ? briefsDir : "./data/briefs"));
    }

    public static void ensureDefaultDirectories() {
        ensureDirectories("jdbc:sqlite:file:./data/radar.db?journal_mode=WAL&busy_timeout=30000", "./data/briefs");
    }

    private static void ensureParentOfSqliteUrl(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            return;
        }
        String lower = jdbcUrl.toLowerCase(Locale.ROOT);
        if (!lower.startsWith("jdbc:sqlite:")) {
            return;
        }
        String pathPart = jdbcUrl.substring("jdbc:sqlite:".length());
        int query = pathPart.indexOf('?');
        if (query >= 0) {
            pathPart = pathPart.substring(0, query);
        }
        if (pathPart.regionMatches(true, 0, "file:", 0, 5)) {
            pathPart = pathPart.substring(5);
        }
        if (pathPart.isBlank() || pathPart.startsWith(":") || ":memory:".equalsIgnoreCase(pathPart)) {
            return;
        }
        Path dbPath = Path.of(pathPart);
        Path parent = dbPath.getParent();
        if (parent != null) {
            ensureDir(parent);
        }
    }

    private static void ensureDir(Path dir) {
        try {
            Files.createDirectories(dir);
            log.debug("ensured_data_dir={}", dir.toAbsolutePath().normalize());
        } catch (IOException e) {
            throw new IllegalStateException("Failed to create data directory: " + dir.toAbsolutePath(), e);
        }
    }
}
