package com.airadar.connector;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Writes pasted Cookie headers into open-source CLI credential files so users
 * configure auth in AI Radar — not by editing each CLI project.
 */
final class CliCredentialWriter {

    private static final Logger log = LoggerFactory.getLogger(CliCredentialWriter.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private CliCredentialWriter() {
    }

    /** jackwener/weibo-cli → {@code ~/.config/weibo-cli/credential.json} */
    static void writeWeiboCookie(String cookieHeader) {
        Map<String, String> cookies = parseCookieHeader(cookieHeader);
        if (cookies.isEmpty()) {
            return;
        }
        Path file = Path.of(System.getProperty("user.home"), ".config", "weibo-cli", "credential.json");
        try {
            Files.createDirectories(file.getParent());
            ObjectNode root = MAPPER.createObjectNode();
            ObjectNode cookieNode = root.putObject("cookies");
            cookies.forEach(cookieNode::put);
            root.put("saved_at", System.currentTimeMillis() / 1000.0);
            writeSecretFile(file, MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(root));
            log.info("wrote weibo-cli credential from source cookie path={}", file);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to write weibo-cli credential: " + e.getMessage(), e);
        }
    }

    /** public-clis/bilibili-cli → {@code ~/.bilibili-cli/credential.json} */
    static void writeBilibiliCookie(String cookieHeader) {
        Map<String, String> cookies = parseCookieHeader(cookieHeader);
        String sessdata = firstCookie(cookies, "SESSDATA");
        if (sessdata == null || sessdata.isBlank()) {
            // Allow pasting SESSDATA alone
            if (cookieHeader != null && !cookieHeader.contains("=") && !cookieHeader.isBlank()) {
                sessdata = cookieHeader.trim();
            } else {
                return;
            }
        }
        Path file = Path.of(System.getProperty("user.home"), ".bilibili-cli", "credential.json");
        try {
            Files.createDirectories(file.getParent());
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("sessdata", sessdata);
            data.put("bili_jct", firstCookie(cookies, "bili_jct", ""));
            data.put("ac_time_value", firstCookie(cookies, "ac_time_value", ""));
            data.put("buvid3", firstCookie(cookies, "buvid3", ""));
            data.put("buvid4", firstCookie(cookies, "buvid4", ""));
            data.put("dedeuserid", firstCookie(cookies, "DedeUserID", firstCookie(cookies, "dedeuserid", "")));
            data.put("saved_at", System.currentTimeMillis() / 1000.0);
            writeSecretFile(file, MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(data));
            log.info("wrote bilibili-cli credential from source cookie path={}", file);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to write bilibili-cli credential: " + e.getMessage(), e);
        }
    }

    static Map<String, String> parseCookieHeader(String raw) {
        Map<String, String> out = new HashMap<>();
        if (raw == null || raw.isBlank()) {
            return out;
        }
        for (String part : raw.split(";")) {
            String p = part.trim();
            if (p.isEmpty()) {
                continue;
            }
            int eq = p.indexOf('=');
            if (eq <= 0) {
                continue;
            }
            String key = p.substring(0, eq).trim();
            String value = p.substring(eq + 1).trim();
            if (!key.isEmpty()) {
                out.put(key, value);
            }
        }
        return out;
    }

    private static String firstCookie(Map<String, String> cookies, String key) {
        return firstCookie(cookies, key, null);
    }

    private static String firstCookie(Map<String, String> cookies, String key, String fallback) {
        for (Map.Entry<String, String> e : cookies.entrySet()) {
            if (e.getKey().equalsIgnoreCase(key)) {
                return e.getValue();
            }
        }
        return fallback;
    }

    private static void writeSecretFile(Path file, String content) throws Exception {
        Files.writeString(file, content);
        try {
            Files.setPosixFilePermissions(file, Set.of(
                    PosixFilePermission.OWNER_READ,
                    PosixFilePermission.OWNER_WRITE
            ));
        } catch (UnsupportedOperationException ignored) {
            // Windows / non-POSIX — best effort
        }
    }
}
