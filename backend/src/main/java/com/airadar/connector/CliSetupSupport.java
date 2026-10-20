package com.airadar.connector;

import java.util.Map;

/**
 * Optional SPI for connectors that can be installed from an allowlisted OSS CLI.
 * Discovered via {@code instanceof} on {@link SourceConnector} beans.
 */
public interface CliSetupSupport {

    CliSetupRecipe setupRecipe();

    /** Persist pasted Cookie into the CLI's credential store. */
    void writeCookie(String cookieHeader);

    /**
     * Resolve the CLI path for this source: env override → config {@code cliPath} → binary name.
     */
    String resolveCliPath(Map<String, Object> sourceConfig);

    /** Smoke-test the binary (small fetch). Does not throw — returns typed state. */
    ProbeResult probe(String cliPath);
}
