package com.airadar.connector;

/**
 * SPI for pulling raw news from an external source.
 *
 * <p>Implementations are discovered as Spring beans and registered by {@link #typeCode()}.
 * Errors should be thrown as unchecked exceptions; the orchestrator isolates per-source failures.
 *
 * <p>See docs/extending-connectors.md.
 */
public interface SourceConnector {

    /**
     * Stable type code stored on {@code sources.type} (e.g. {@code RSS}, {@code FIXTURE}).
     */
    default String typeCode() {
        return type().name();
    }

    /**
     * Built-in enum for known connectors. Prefer {@link #typeCode()} for plugins.
     */
    com.airadar.domain.SourceType type();

    /**
     * Human / UI descriptor. Plugins should override.
     */
    default ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of(typeCode(), typeCode(), java.util.List.of());
    }

    java.util.List<com.airadar.domain.RawItem> fetch(com.airadar.domain.FetchContext ctx);
}
