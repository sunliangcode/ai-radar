package com.airadar.connector;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class ConnectorRegistry {

    private final Map<String, SourceConnector> byCode = new LinkedHashMap<>();

    public ConnectorRegistry(List<SourceConnector> connectors) {
        for (SourceConnector c : connectors) {
            byCode.put(c.typeCode().toUpperCase(), c);
        }
    }

    public SourceConnector get(String typeCode) {
        if (typeCode == null || typeCode.isBlank()) {
            return null;
        }
        return byCode.get(typeCode.toUpperCase());
    }

    public Collection<SourceConnector> all() {
        return byCode.values();
    }

    public List<ConnectorDescriptor> descriptors() {
        return byCode.values().stream().map(SourceConnector::descriptor).toList();
    }
}
