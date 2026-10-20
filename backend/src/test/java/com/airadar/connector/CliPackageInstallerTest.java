package com.airadar.connector;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CliPackageInstallerTest {

    @TempDir
    Path tempDir;

    @Test
    void packageInstallCommandsPreferUvThenPipxThenPip() {
        List<List<String>> cmds = CliPackageInstaller.packageInstallCommands("bilibili-cli");
        assertEquals(List.of("uv", "tool", "install", "bilibili-cli"), cmds.get(0));
        assertEquals(List.of("pipx", "install", "bilibili-cli"), cmds.get(1));
        assertEquals(List.of("python3", "-m", "pip", "install", "--user", "bilibili-cli"), cmds.get(2));
    }

    @Test
    void installUsesUvWhenAvailableAndWritesBinary() throws Exception {
        AtomicInteger uvCalls = new AtomicInteger();
        Path bin = tempDir.resolve("bili");
        CliPackageInstaller installer = new CliPackageInstaller((command, cwd, timeout) -> {
            String joined = String.join(" ", command);
            if (joined.contains("command -v") || joined.startsWith("where ")) {
                if (Files.isExecutable(bin)) {
                    return new CliPackageInstaller.ExecResult(0, bin.toString());
                }
                return new CliPackageInstaller.ExecResult(1, "");
            }
            if (joined.startsWith("uv tool install")) {
                uvCalls.incrementAndGet();
                Files.writeString(bin, "#!/bin/sh\necho ok\n");
                bin.toFile().setExecutable(true);
                return new CliPackageInstaller.ExecResult(0, "ok");
            }
            return new CliPackageInstaller.ExecResult(1, "unexpected " + joined);
        }, () -> tempDir);

        CliSetupRecipe recipe = new CliSetupRecipe(
                "https://github.com/jackwener/bilibili-cli",
                "bilibili-cli",
                "bili",
                "bili",
                List.of()
        );
        CliPackageInstaller.InstallResult result = installer.install(recipe);
        assertEquals(1, uvCalls.get());
        assertTrue(result.cliPath().endsWith("bili") || result.cliPath().contains("bili"));
        assertTrue(result.method().contains("uv"));
    }

    @Test
    void installFallsBackToCloneWhenPackageManagersFail() throws Exception {
        List<String> seen = new ArrayList<>();
        Path cloneRoot = tempDir.resolve(".ai-radar").resolve("clis").resolve("weibo");
        CliPackageInstaller installer = new CliPackageInstaller((command, cwd, timeout) -> {
            String joined = String.join(" ", command);
            seen.add(joined);
            if (joined.contains("command -v") || joined.startsWith("where ")) {
                Path bin = cloneRoot.resolve("weibo");
                if (Files.isExecutable(bin)) {
                    return new CliPackageInstaller.ExecResult(0, bin.toString());
                }
                return new CliPackageInstaller.ExecResult(1, "");
            }
            if (joined.startsWith("uv tool install")
                    || joined.startsWith("pipx install")
                    || joined.contains("pip install --user")) {
                return new CliPackageInstaller.ExecResult(127, "not found");
            }
            if (joined.startsWith("git clone")) {
                Files.createDirectories(cloneRoot);
                return new CliPackageInstaller.ExecResult(0, "cloned");
            }
            if (joined.equals("uv sync") || joined.startsWith("uv pip")) {
                Path bin = cloneRoot.resolve("weibo");
                Files.writeString(bin, "#!/bin/sh\necho ok\n");
                bin.toFile().setExecutable(true);
                return new CliPackageInstaller.ExecResult(0, "built");
            }
            return new CliPackageInstaller.ExecResult(1, "unexpected " + joined);
        }, () -> tempDir);

        CliSetupRecipe recipe = new CliSetupRecipe(
                "https://github.com/jackwener/weibo-cli",
                "kabi-weibo-cli",
                "weibo",
                "weibo",
                List.of(List.of("uv", "sync"))
        );
        CliPackageInstaller.InstallResult result = installer.install(recipe);
        assertEquals("clone", result.method());
        assertTrue(Files.isExecutable(Path.of(result.cliPath())));
        assertTrue(seen.stream().anyMatch(s -> s.startsWith("git clone")));
    }
}
