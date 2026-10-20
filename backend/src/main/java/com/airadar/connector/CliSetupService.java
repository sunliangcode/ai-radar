package com.airadar.connector;

import com.airadar.persistence.SourceEntity;
import com.airadar.persistence.SourceRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CliSetupService {

    public static final String STATE_READY = "ready";
    public static final String STATE_CLI_MISSING = "cli_missing";
    public static final String STATE_NEED_COOKIE = "need_cookie";
    public static final String STATE_UNREACHABLE = "unreachable";
    public static final String STATE_UNSUPPORTED = "unsupported";

    private final SourceRepository sourceRepository;
    private final ConnectorRegistry connectorRegistry;
    private final CliPackageInstaller installer;
    private final ObjectMapper objectMapper;
    private final CliInstallProgress installProgress;
    /** binaryName → true while install is running. */
    private final ConcurrentHashMap<String, Boolean> installBusy = new ConcurrentHashMap<>();

    public CliSetupService(
            SourceRepository sourceRepository,
            ConnectorRegistry connectorRegistry,
            CliPackageInstaller installer,
            ObjectMapper objectMapper,
            CliInstallProgress installProgress
    ) {
        this.sourceRepository = sourceRepository;
        this.connectorRegistry = connectorRegistry;
        this.installer = installer;
        this.objectMapper = objectMapper;
        this.installProgress = installProgress;
    }

    public Map<String, Object> statusBatch(Collection<Long> sourceIds) {
        Map<String, Object> items = new LinkedHashMap<>();
        if (sourceIds != null) {
            for (Long id : sourceIds) {
                if (id == null) {
                    continue;
                }
                try {
                    items.put(String.valueOf(id), status(id));
                } catch (NoSuchElementException ignored) {
                    // omit deleted / unknown ids from batch
                }
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("items", items);
        return out;
    }

    public Map<String, Object> status(long sourceId) {
        SourceEntity entity = requireSource(sourceId);
        CliSetupSupport support = setupSupport(entity);
        if (support == null) {
            return unsupportedDto();
        }
        CliSetupRecipe recipe = support.setupRecipe();
        Map<String, Object> config = readConfig(entity);
        String cliPath = support.resolveCliPath(config);
        if (!OpenSourceCliRunner.isExecutable(cliPath) && !looksLikePathCommand(cliPath)) {
            String resolved = installer.which(recipe.binaryName());
            if (resolved != null) {
                cliPath = resolved;
            }
        }
        ProbeResult probe;
        if (!OpenSourceCliRunner.isExecutable(cliPath)) {
            if (cliPath != null && !cliPath.contains("/") && !cliPath.contains("\\")) {
                probe = support.probe(cliPath);
                if (ProbeResult.CLI_MISSING.equals(probe.state())
                        || (ProbeResult.FAILED.equals(probe.state())
                        && probe.reason() != null
                        && probe.reason().toLowerCase().contains("not found"))) {
                    probe = ProbeResult.cliMissing("CLI not found: " + cliPath);
                }
            } else {
                probe = ProbeResult.cliMissing("CLI not found: " + (cliPath == null ? "" : cliPath));
            }
        } else {
            probe = support.probe(cliPath);
        }
        return successDto(recipe, cliPath, probe, entity.isEnabled(), null, null);
    }

    public Map<String, Object> install(long sourceId) {
        SourceEntity entity = requireSource(sourceId);
        CliSetupSupport support = setupSupport(entity);
        if (support == null) {
            throw SetupException.unsupported();
        }
        CliSetupRecipe recipe = support.setupRecipe();
        if (installBusy.putIfAbsent(recipe.binaryName(), Boolean.TRUE) != null) {
            throw SetupException.conflict("install already in progress for " + recipe.binaryName());
        }
        installProgress.start(recipe.binaryName());
        try {
            CliPackageInstaller.InstallResult result;
            try {
                result = installer.install(recipe, (phase, message) ->
                        installProgress.phase(recipe.binaryName(), phase, message));
            } catch (Exception e) {
                throw SetupException.classifyInstall(e.getMessage());
            }
            Map<String, Object> config = readConfig(entity);
            config.put("cliPath", result.cliPath());
            try {
                entity.setConfigJson(objectMapper.writeValueAsString(config));
            } catch (Exception e) {
                throw new SetupException("setup_install_failed", "failed to save cliPath: " + e.getMessage());
            }
            sourceRepository.save(entity);
            installProgress.phase(recipe.binaryName(), "probe", "Smoke test");
            ProbeResult probe = support.probe(result.cliPath());
            return successDto(recipe, result.cliPath(), probe, entity.isEnabled(), result.method(), result.detail());
        } finally {
            installProgress.clear(recipe.binaryName());
            installBusy.remove(recipe.binaryName());
        }
    }

    public Map<String, Object> probe(long sourceId, String cookie, boolean enableOnSuccess) {
        SourceEntity entity = requireSource(sourceId);
        CliSetupSupport support = setupSupport(entity);
        if (support == null) {
            throw SetupException.unsupported();
        }
        CliSetupRecipe recipe = support.setupRecipe();
        Map<String, Object> config = readConfig(entity);
        if (cookie != null && !cookie.isBlank()) {
            support.writeCookie(cookie.trim());
            config.put("cookie", cookie.trim());
            try {
                entity.setConfigJson(objectMapper.writeValueAsString(config));
                sourceRepository.save(entity);
            } catch (Exception e) {
                throw new SetupException("setup_cookie_write_failed",
                        e.getMessage() == null ? "failed to save cookie" : e.getMessage());
            }
        }
        String cliPath = support.resolveCliPath(readConfig(entity));
        ProbeResult probe = support.probe(cliPath);
        if (ProbeResult.OK.equals(probe.state()) && enableOnSuccess && !entity.isEnabled()) {
            entity.setEnabled(true);
            sourceRepository.save(entity);
        }
        return successDto(recipe, cliPath, probe, entity.isEnabled(), null, null);
    }

    private Map<String, Object> unsupportedDto() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("supported", false);
        out.put("state", STATE_UNSUPPORTED);
        out.put("cliPath", "");
        out.put("installAvailable", false);
        out.put("reason", "");
        out.put("openSourceUrl", "");
        out.put("binaryName", "");
        out.put("hintCode", "setup_unsupported");
        out.put("busy", false);
        out.put("enabled", false);
        return out;
    }

    private Map<String, Object> successDto(
            CliSetupRecipe recipe,
            String cliPath,
            ProbeResult probe,
            boolean enabled,
            String method,
            String detail
    ) {
        String state = mapProbeToSetupState(probe);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("supported", true);
        out.put("state", state);
        out.put("cliPath", cliPath == null ? "" : cliPath);
        out.put("installAvailable", !STATE_READY.equals(state));
        out.put("reason", probe.reason() == null ? "" : probe.reason());
        out.put("openSourceUrl", recipe.repoUrl());
        out.put("binaryName", recipe.binaryName());
        out.put("hintCode", hintCodeFor(state));
        out.put("busy", Boolean.TRUE.equals(installBusy.get(recipe.binaryName())));
        out.put("enabled", enabled);
        if (method != null) {
            out.put("method", method);
        }
        if (detail != null) {
            out.put("detail", detail);
        }
        attachInstallProgress(out, recipe.binaryName());
        return out;
    }

    private void attachInstallProgress(Map<String, Object> out, String binaryName) {
        CliInstallProgress.Snapshot snap = installProgress.get(binaryName);
        if (snap == null) {
            return;
        }
        out.put("installPhase", snap.phase());
        out.put("installMessage", snap.message() == null ? "" : snap.message());
        out.put("busy", true);
    }

    static String hintCodeFor(String state) {
        return switch (state) {
            case STATE_READY -> "setup_ready";
            case STATE_CLI_MISSING -> "setup_cli_missing";
            case STATE_NEED_COOKIE -> "setup_need_cookie";
            default -> "setup_unreachable";
        };
    }

    private static String mapProbeToSetupState(ProbeResult probe) {
        if (probe == null) {
            return STATE_UNREACHABLE;
        }
        return switch (probe.state()) {
            case ProbeResult.OK -> STATE_READY;
            case ProbeResult.NEED_COOKIE -> STATE_NEED_COOKIE;
            case ProbeResult.CLI_MISSING -> STATE_CLI_MISSING;
            default -> STATE_UNREACHABLE;
        };
    }

    private CliSetupSupport setupSupport(SourceEntity entity) {
        SourceConnector connector = connectorRegistry.get(entity.getType().name());
        if (connector instanceof CliSetupSupport s) {
            return s;
        }
        return null;
    }

    private SourceEntity requireSource(long id) {
        return sourceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("source not found: " + id));
    }

    private Map<String, Object> readConfig(SourceEntity entity) {
        try {
            String json = entity.getConfigJson() == null ? "{}" : entity.getConfigJson();
            Map<String, Object> map = objectMapper.readValue(json, new TypeReference<>() {
            });
            return map == null ? new LinkedHashMap<>() : new LinkedHashMap<>(map);
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    private static boolean looksLikePathCommand(String cliPath) {
        return cliPath != null && (cliPath.contains("/") || cliPath.contains("\\"));
    }
}
