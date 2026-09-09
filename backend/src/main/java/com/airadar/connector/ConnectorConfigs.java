package com.airadar.connector;

import com.airadar.domain.FetchContext;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

final class ConnectorConfigs {

    private ConnectorConfigs() {
    }

    static String string(FetchContext ctx, String key, String defaultValue) {
        Object v = ctx.source().config().get(key);
        return v == null || v.toString().isBlank() ? defaultValue : v.toString().trim();
    }

    static int integer(FetchContext ctx, String key, int defaultValue) {
        Object v = ctx.source().config().get(key);
        if (v == null) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(v.toString().trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    @SuppressWarnings("unchecked")
    static List<String> stringList(FetchContext ctx, String key, List<String> defaults) {
        Object v = ctx.source().config().get(key);
        if (v == null) {
            return defaults;
        }
        if (v instanceof Collection<?> collection) {
            List<String> out = new ArrayList<>();
            for (Object item : collection) {
                if (item != null && !item.toString().isBlank()) {
                    out.add(item.toString().trim());
                }
            }
            return out.isEmpty() ? defaults : out;
        }
        String raw = v.toString().trim();
        if (raw.isBlank()) {
            return defaults;
        }
        List<String> out = new ArrayList<>();
        for (String part : raw.split("[,\\s]+")) {
            if (!part.isBlank()) {
                out.add(part.trim());
            }
        }
        return out.isEmpty() ? defaults : out;
    }
}
