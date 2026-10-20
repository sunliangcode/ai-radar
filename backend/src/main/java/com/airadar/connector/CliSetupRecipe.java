package com.airadar.connector;

import java.util.List;

/**
 * Allowlisted install metadata for a CLI-backed connector.
 * Package names and repo URLs come from connector code — never from the client.
 */
public record CliSetupRecipe(
        String repoUrl,
        String pypiPackage,
        String binaryName,
        String installRelPath,
        List<List<String>> buildCommands
) {
    public CliSetupRecipe {
        if (repoUrl == null || repoUrl.isBlank()) {
            throw new IllegalArgumentException("repoUrl required");
        }
        if (pypiPackage == null || pypiPackage.isBlank()) {
            throw new IllegalArgumentException("pypiPackage required");
        }
        if (binaryName == null || binaryName.isBlank()) {
            throw new IllegalArgumentException("binaryName required");
        }
        installRelPath = installRelPath == null ? binaryName : installRelPath;
        buildCommands = buildCommands == null ? List.of() : List.copyOf(buildCommands);
    }
}
