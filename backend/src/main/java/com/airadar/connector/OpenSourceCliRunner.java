package com.airadar.connector;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/** Shared runner for open-source CLIs (zhihu / weibo / bili). */
public final class OpenSourceCliRunner {

    private OpenSourceCliRunner() {
    }

    public static boolean isExecutable(String path) {
        if (path == null || path.isBlank()) {
            return false;
        }
        try {
            return Files.isExecutable(Path.of(path.trim()));
        } catch (Exception e) {
            return false;
        }
    }

    public static String preferredPath(String envKey, String fallback) {
        String fromEnv = System.getenv(envKey);
        if (fromEnv != null && !fromEnv.isBlank()) {
            return fromEnv.trim();
        }
        return fallback;
    }

    public static String run(
            String cliPath,
            List<String> args,
            Map<String, String> extraEnv,
            Duration timeout,
            String label
    ) throws Exception {
        List<String> command = new ArrayList<>();
        command.add(cliPath);
        command.addAll(args);
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        if (extraEnv != null && !extraEnv.isEmpty()) {
            pb.environment().putAll(extraEnv);
        }
        Process process = pb.start();
        StringBuilder stdout = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (stdout.length() > 0) {
                    stdout.append('\n');
                }
                stdout.append(line);
            }
        }
        boolean finished = process.waitFor(timeout.toSeconds(), TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new IllegalStateException(label + " CLI timed out: " + String.join(" ", command));
        }
        int code = process.exitValue();
        if (code != 0) {
            String msg = stdout.toString();
            if (msg.length() > 400) {
                msg = msg.substring(0, 400);
            }
            throw new IllegalStateException(label + " CLI exit " + code + ": " + msg);
        }
        return stdout.toString();
    }
}
