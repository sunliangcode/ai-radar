package com.airadar.connector;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** In-memory install phase for CLI setup (single-user; polled while POST /setup/install runs). */
@Component
public class CliInstallProgress {

    public record Snapshot(String phase, String message, Instant updatedAt) {
    }

    private final ConcurrentHashMap<String, Snapshot> byBinary = new ConcurrentHashMap<>();

    public void start(String binaryName) {
        if (binaryName == null || binaryName.isBlank()) {
            return;
        }
        byBinary.put(binaryName, new Snapshot("package", "starting", Instant.now()));
    }

    public void phase(String binaryName, String phase, String message) {
        if (binaryName == null || binaryName.isBlank()) {
            return;
        }
        String msg = message == null ? "" : message;
        byBinary.put(binaryName, new Snapshot(phase, msg, Instant.now()));
    }

    public Snapshot get(String binaryName) {
        if (binaryName == null) {
            return null;
        }
        return byBinary.get(binaryName);
    }

    public void clear(String binaryName) {
        if (binaryName != null) {
            byBinary.remove(binaryName);
        }
    }

    /** For diagnostics only. */
    Map<String, Snapshot> snapshots() {
        return Map.copyOf(byBinary);
    }
}
