package com.airadar.connector;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * Installs allowlisted PyPI CLI packages via uv/pipx/pip, with git-clone fallback.
 */
@Component
public class CliPackageInstaller {

    private static final Logger log = LoggerFactory.getLogger(CliPackageInstaller.class);
    private static final Duration TIMEOUT = Duration.ofMinutes(10);

    public interface CommandRunner {
        /** Run argv; return exit code + combined stdout/stderr. */
        ExecResult run(List<String> command, Path cwd, Duration timeout) throws Exception;
    }

    public record ExecResult(int exitCode, String output) {
    }

    public record InstallResult(String cliPath, String method, String detail) {
    }

    private final CommandRunner runner;
    private final Supplier<Path> homeDir;

    public CliPackageInstaller() {
        this(CliPackageInstaller::defaultRun, () -> Path.of(System.getProperty("user.home")));
    }

    CliPackageInstaller(CommandRunner runner, Supplier<Path> homeDir) {
        this.runner = runner;
        this.homeDir = homeDir;
    }

    @FunctionalInterface
    public interface PhaseListener {
        void onPhase(String phase, String message);
    }

    public InstallResult install(CliSetupRecipe recipe) throws Exception {
        return install(recipe, null);
    }

    public InstallResult install(CliSetupRecipe recipe, PhaseListener listener) throws Exception {
        String existing = which(recipe.binaryName());
        if (existing != null && OpenSourceCliRunner.isExecutable(existing)) {
            notify(listener, "resolve", "binary already on PATH");
            return new InstallResult(existing, "already_present", "binary already on PATH");
        }

        notify(listener, "package", "Trying PyPI install (uv / pipx / pip)");
        Exception last = null;
        for (List<String> cmd : packageInstallCommands(recipe.pypiPackage())) {
            try {
                notify(listener, "package", String.join(" ", cmd));
                ExecResult r = runner.run(cmd, null, TIMEOUT);
                if (r.exitCode() == 0) {
                    String path = which(recipe.binaryName());
                    if (path != null && OpenSourceCliRunner.isExecutable(path)) {
                        return new InstallResult(path, String.join(" ", cmd.subList(0, Math.min(2, cmd.size()))),
                                truncate(r.output()));
                    }
                    last = new IllegalStateException("install succeeded but binary not found: " + recipe.binaryName());
                } else {
                    last = new IllegalStateException(cmd.get(0) + " exit " + r.exitCode() + ": " + truncate(r.output()));
                }
            } catch (Exception e) {
                last = e;
                log.debug("package install attempt failed cmd={}: {}", cmd, e.getMessage());
            }
        }

        // Clone fallback
        notify(listener, "clone", "Cloning " + recipe.repoUrl());
        Path dest = homeDir.get().resolve(".ai-radar").resolve("clis").resolve(recipe.binaryName());
        Files.createDirectories(dest.getParent());
        if (!Files.isDirectory(dest.resolve(".git"))) {
            if (Files.exists(dest)) {
                // incomplete prior install
                deleteRecursively(dest);
            }
            ExecResult clone = runner.run(
                    List.of("git", "clone", "--depth", "1", recipe.repoUrl(), dest.toString()),
                    null,
                    TIMEOUT
            );
            if (clone.exitCode() != 0) {
                throw new IllegalStateException("git clone failed: " + truncate(clone.output()), last);
            }
        }
        for (List<String> build : recipe.buildCommands()) {
            notify(listener, "build", String.join(" ", build));
            ExecResult b = runner.run(build, dest, TIMEOUT);
            if (b.exitCode() != 0) {
                throw new IllegalStateException("build failed: " + truncate(b.output()), last);
            }
        }
        notify(listener, "resolve", "Locating built binary");
        Path binary = dest.resolve(recipe.installRelPath());
        if (!OpenSourceCliRunner.isExecutable(binary.toString())) {
            // try .venv/bin/<binary>
            Path venvBin = dest.resolve(".venv").resolve("bin").resolve(recipe.binaryName());
            if (OpenSourceCliRunner.isExecutable(venvBin.toString())) {
                binary = venvBin;
            } else {
                throw new IllegalStateException("binary not executable after build: " + binary, last);
            }
        }
        return new InstallResult(binary.toAbsolutePath().normalize().toString(), "clone", dest.toString());
    }

    private static void notify(PhaseListener listener, String phase, String message) {
        if (listener != null) {
            listener.onPhase(phase, message);
        }
    }

    static List<List<String>> packageInstallCommands(String pypiPackage) {
        List<List<String>> cmds = new ArrayList<>();
        cmds.add(List.of("uv", "tool", "install", pypiPackage));
        cmds.add(List.of("pipx", "install", pypiPackage));
        cmds.add(List.of("python3", "-m", "pip", "install", "--user", pypiPackage));
        return cmds;
    }

    String which(String binary) {
        try {
            String os = System.getProperty("os.name", "").toLowerCase();
            List<String> cmd = os.contains("win")
                    ? List.of("where", binary)
                    : List.of("sh", "-c", "command -v " + shellQuote(binary));
            ExecResult r = runner.run(cmd, null, Duration.ofSeconds(10));
            if (r.exitCode() != 0 || r.output() == null || r.output().isBlank()) {
                return null;
            }
            String first = r.output().lines().map(String::trim).filter(s -> !s.isEmpty()).findFirst().orElse(null);
            return first;
        } catch (Exception e) {
            return null;
        }
    }

    private static String shellQuote(String s) {
        return "'" + s.replace("'", "'\\''") + "'";
    }

    private static String truncate(String s) {
        if (s == null) {
            return "";
        }
        String t = s.trim();
        return t.length() > 400 ? t.substring(0, 400) : t;
    }

    private static void deleteRecursively(Path root) throws Exception {
        if (!Files.exists(root)) {
            return;
        }
        try (var walk = Files.walk(root)) {
            List<Path> paths = walk.sorted((a, b) -> b.compareTo(a)).toList();
            for (Path p : paths) {
                Files.deleteIfExists(p);
            }
        }
    }

    private static ExecResult defaultRun(List<String> command, Path cwd, Duration timeout) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(command);
        if (cwd != null) {
            pb.directory(cwd.toFile());
        }
        pb.redirectErrorStream(true);
        Process process = pb.start();
        StringBuilder out = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (out.length() > 0) {
                    out.append('\n');
                }
                out.append(line);
            }
        }
        boolean finished = process.waitFor(timeout.toSeconds(), TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new IllegalStateException("timed out: " + String.join(" ", command));
        }
        return new ExecResult(process.exitValue(), out.toString());
    }
}
