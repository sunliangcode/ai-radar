package com.airadar.connector;

import java.util.List;

public record ConnectorDescriptor(
        String id,
        String displayName,
        List<ConfigField> configFields
) {
    public static ConnectorDescriptor of(String id, String displayName, List<ConfigField> fields) {
        return new ConnectorDescriptor(id, displayName, fields == null ? List.of() : fields);
    }

    public record ConfigField(String key, String label, String type, boolean required) {
        public static ConfigField text(String key, String label, boolean required) {
            return new ConfigField(key, label, "text", required);
        }

        public static ConfigField path(String key, String label, boolean required) {
            return new ConfigField(key, label, "path", required);
        }
    }
}
