package com.airadar.connector;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class ConnectorRegistry {

    /** Field types the Sources UI understands (must stay lowercase). */
    static final Set<String> CONFIG_FIELD_TYPES = Set.of("text", "path", "secret", "textarea");

    private final Map<String, SourceConnector> byCode = new LinkedHashMap<>();

    public ConnectorRegistry(List<SourceConnector> connectors) {
        for (SourceConnector c : connectors) {
            String raw = c.typeCode();
            if (raw == null || raw.isBlank()) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName() + " has a blank typeCode()");
            }
            if (!raw.equals(raw.trim())) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName()
                                + " typeCode() has surrounding whitespace");
            }
            String key = raw.trim().toUpperCase();
            SourceConnector previous = byCode.putIfAbsent(key, c);
            if (previous != null) {
                throw new IllegalStateException(
                        "Duplicate SourceConnector typeCode " + key + ": "
                                + previous.getClass().getName() + " and " + c.getClass().getName());
            }
            ConnectorDescriptor descriptor = c.descriptor();
            String rawId = descriptor == null || descriptor.id() == null ? "" : descriptor.id();
            if (!rawId.equals(rawId.trim())) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName()
                                + " descriptor id has surrounding whitespace");
            }
            String id = rawId.trim();
            if (!key.equals(id.toUpperCase())) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName()
                                + " descriptor id \"" + id + "\" != typeCode " + key);
            }
            String rawName = descriptor.displayName() == null ? "" : descriptor.displayName();
            if (!rawName.equals(rawName.trim())) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName()
                                + " displayName has surrounding whitespace");
            }
            if (rawName.trim().isEmpty()) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName() + " has a blank displayName");
            }
            requireUniqueConfigFields(c, descriptor.configFields());
        }
    }

    private static void requireUniqueConfigFields(SourceConnector c, List<ConnectorDescriptor.ConfigField> fields) {
        if (fields == null) {
            throw new IllegalStateException(
                    "SourceConnector " + c.getClass().getName() + " descriptor configFields is null");
        }
        Set<String> seen = new HashSet<>();
        for (ConnectorDescriptor.ConfigField field : fields) {
            if (field == null) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName() + " has a null config field");
            }
            String rawFieldKey = field.key() == null ? "" : field.key();
            if (!rawFieldKey.equals(rawFieldKey.trim())) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName()
                                + " config field key has surrounding whitespace");
            }
            String fieldKey = rawFieldKey.trim();
            if (fieldKey.isEmpty()) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName() + " has a blank config field key");
            }
            if (!seen.add(fieldKey.toLowerCase())) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName()
                                + " has a duplicate config field key " + fieldKey.toLowerCase());
            }
            String rawFieldType = field.type() == null ? "" : field.type();
            if (!rawFieldType.equals(rawFieldType.trim())) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName()
                                + " config field " + fieldKey + " type has surrounding whitespace");
            }
            String fieldType = rawFieldType.trim();
            if (fieldType.isEmpty()) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName()
                                + " config field " + fieldKey + " has a blank type");
            }
            if (!CONFIG_FIELD_TYPES.contains(fieldType)) {
                throw new IllegalStateException(
                        "SourceConnector " + c.getClass().getName()
                                + " config field " + fieldKey + " has unknown type \"" + fieldType
                                + "\" (allowed: " + CONFIG_FIELD_TYPES + ")");
            }
        }
    }

    public SourceConnector get(String typeCode) {
        if (typeCode == null) {
            return null;
        }
        String key = typeCode.trim().toUpperCase();
        if (key.isEmpty()) {
            return null;
        }
        return byCode.get(key);
    }

    public Collection<SourceConnector> all() {
        return byCode.values();
    }

    public List<ConnectorDescriptor> descriptors() {
        return byCode.values().stream()
                .map(SourceConnector::descriptor)
                .sorted(Comparator.comparing(ConnectorDescriptor::id, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }
}
