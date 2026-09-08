package com.airadar.domain;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;

public final class UrlNormalizer {

    private static final Set<String> TRACKING_PARAMS = Set.of(
            "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
            "utm_id", "fbclid", "gclid", "mc_cid", "mc_eid", "ref", "ref_src"
    );

    private UrlNormalizer() {
    }

    public static String canonicalize(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return "";
        }
        try {
            String trimmed = rawUrl.trim();
            URI uri = URI.create(trimmed);
            String scheme = uri.getScheme() == null ? "https" : uri.getScheme().toLowerCase(Locale.ROOT);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (host.startsWith("www.")) {
                host = host.substring(4);
            }
            int port = uri.getPort();
            String path = uri.getPath() == null ? "" : uri.getPath();
            if (path.endsWith("/") && path.length() > 1) {
                path = path.substring(0, path.length() - 1);
            }
            String query = filterQuery(uri.getRawQuery());
            StringBuilder sb = new StringBuilder();
            sb.append(scheme).append("://").append(host);
            if (port > 0 && port != 80 && port != 443) {
                sb.append(':').append(port);
            }
            sb.append(path.isEmpty() ? "" : path);
            if (!query.isEmpty()) {
                sb.append('?').append(query);
            }
            return sb.toString();
        } catch (Exception e) {
            return rawUrl.trim();
        }
    }

    private static String filterQuery(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) {
            return "";
        }
        List<String> kept = new ArrayList<>();
        for (String part : rawQuery.split("&")) {
            if (part.isBlank()) {
                continue;
            }
            int eq = part.indexOf('=');
            String key = eq >= 0 ? part.substring(0, eq) : part;
            String decodedKey = URLDecoder.decode(key, StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
            if (TRACKING_PARAMS.contains(decodedKey) || decodedKey.startsWith("utm_")) {
                continue;
            }
            kept.add(part);
        }
        return String.join("&", new TreeSet<>(kept));
    }
}
