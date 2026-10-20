package com.airadar.connector;

import com.airadar.domain.SourceType;
import com.airadar.persistence.SourceEntity;
import com.airadar.persistence.SourceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CliSetupServiceTest {

    @TempDir
    Path tempDir;

    private SourceRepository sourceRepository;
    private ConnectorRegistry connectorRegistry;
    private CliSetupService service;
    private FakeSupport support;

    @BeforeEach
    void setUp() throws Exception {
        sourceRepository = mock(SourceRepository.class);
        connectorRegistry = mock(ConnectorRegistry.class);
        support = new FakeSupport(tempDir);
        when(connectorRegistry.get("BILIBILI")).thenReturn(support);

        CliPackageInstaller installer = new CliPackageInstaller((command, cwd, timeout) -> {
            String joined = String.join(" ", command);
            if (joined.contains("command -v") || joined.startsWith("where ")) {
                Path bin = tempDir.resolve("bili");
                if (Files.isExecutable(bin)) {
                    return new CliPackageInstaller.ExecResult(0, bin.toString());
                }
                return new CliPackageInstaller.ExecResult(1, "");
            }
            if (joined.contains("uv tool install") || joined.contains("pipx install") || joined.contains("pip install")) {
                Path bin = tempDir.resolve("bili");
                Files.writeString(bin, "#!/bin/sh\necho ok\n");
                bin.toFile().setExecutable(true);
                return new CliPackageInstaller.ExecResult(0, "installed");
            }
            return new CliPackageInstaller.ExecResult(1, "unexpected: " + joined);
        }, () -> tempDir);

        service = new CliSetupService(
                sourceRepository,
                connectorRegistry,
                installer,
                new ObjectMapper(),
                new CliInstallProgress());
    }

    @Test
    void installAvailableWhenCliMissingWithoutAi() {
        SourceEntity entity = source("BILIBILI", "{}");
        when(sourceRepository.findById(1L)).thenReturn(Optional.of(entity));
        support.probeResult = ProbeResult.cliMissing("not found");

        Map<String, Object> status = service.status(1L);
        assertTrue((Boolean) status.get("supported"));
        assertEquals(CliSetupService.STATE_CLI_MISSING, status.get("state"));
        assertTrue((Boolean) status.get("installAvailable"));
        assertEquals("setup_cli_missing", status.get("hintCode"));
        assertEquals("bili", status.get("binaryName"));
    }

    @Test
    void installNotAvailableWhenReady() {
        SourceEntity entity = source("BILIBILI", "{\"cliPath\":\"bili\"}");
        when(sourceRepository.findById(1L)).thenReturn(Optional.of(entity));
        support.probeResult = ProbeResult.ok();

        Map<String, Object> status = service.status(1L);
        assertEquals(CliSetupService.STATE_READY, status.get("state"));
        assertFalse((Boolean) status.get("installAvailable"));
    }

    @Test
    void statusBatchReturnsMapById() {
        SourceEntity entity = source("BILIBILI", "{}");
        when(sourceRepository.findById(1L)).thenReturn(Optional.of(entity));
        support.probeResult = ProbeResult.cliMissing("not found");

        Map<String, Object> batch = service.statusBatch(List.of(1L, 99L));
        @SuppressWarnings("unchecked")
        Map<String, Object> items = (Map<String, Object>) batch.get("items");
        assertEquals(1, items.size());
        assertEquals(CliSetupService.STATE_CLI_MISSING, ((Map<?, ?>) items.get("1")).get("state"));
    }

    @Test
    void installWritesCliPath() throws Exception {
        SourceEntity entity = source("BILIBILI", "{}");
        when(sourceRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(sourceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        support.probeResult = ProbeResult.ok();

        Map<String, Object> result = service.install(1L);
        assertTrue(String.valueOf(result.get("cliPath")).contains("bili"));
        assertTrue(entity.getConfigJson().contains("cliPath"));
    }

    @Test
    void probeEnablesOnSuccess() {
        SourceEntity entity = source("BILIBILI", "{\"cliPath\":\"bili\"}");
        entity.setEnabled(false);
        when(sourceRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(sourceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        support.probeResult = ProbeResult.ok();

        Map<String, Object> result = service.probe(1L, "SESSDATA=x", true);
        assertEquals(CliSetupService.STATE_READY, result.get("state"));
        assertTrue(entity.isEnabled());
        assertEquals(1, support.cookieWrites.get());
    }

    @Test
    void unsupportedType() {
        SourceEntity entity = source("RSS", "{}");
        when(sourceRepository.findById(2L)).thenReturn(Optional.of(entity));
        when(connectorRegistry.get("RSS")).thenReturn(mock(SourceConnector.class));

        Map<String, Object> status = service.status(2L);
        assertFalse((Boolean) status.get("supported"));
        assertEquals(CliSetupService.STATE_UNSUPPORTED, status.get("state"));
    }

    private static SourceEntity source(String type, String config) {
        SourceEntity e = new SourceEntity();
        e.setId(1L);
        e.setName("test");
        e.setType(SourceType.valueOf(type.equals("RSS") ? "RSS" : type));
        if ("RSS".equals(type)) {
            e.setId(2L);
        }
        e.setEnabled(false);
        e.setConfigJson(config);
        return e;
    }

    /** Minimal SourceConnector + CliSetupSupport for tests. */
    static final class FakeSupport implements SourceConnector, CliSetupSupport {
        final Path home;
        ProbeResult probeResult = ProbeResult.ok();
        final AtomicInteger cookieWrites = new AtomicInteger();

        FakeSupport(Path home) {
            this.home = home;
        }

        @Override
        public SourceType type() {
            return SourceType.BILIBILI;
        }

        @Override
        public List<com.airadar.domain.RawItem> fetch(com.airadar.domain.FetchContext ctx) {
            return List.of();
        }

        @Override
        public CliSetupRecipe setupRecipe() {
            return new CliSetupRecipe(
                    "https://github.com/jackwener/bilibili-cli",
                    "bilibili-cli",
                    "bili",
                    "bili",
                    List.of()
            );
        }

        @Override
        public void writeCookie(String cookieHeader) {
            cookieWrites.incrementAndGet();
        }

        @Override
        public String resolveCliPath(Map<String, Object> sourceConfig) {
            if (sourceConfig != null && sourceConfig.get("cliPath") != null) {
                return String.valueOf(sourceConfig.get("cliPath"));
            }
            return "bili";
        }

        @Override
        public ProbeResult probe(String cliPath) {
            return probeResult;
        }
    }
}
