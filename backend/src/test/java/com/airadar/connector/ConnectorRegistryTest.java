package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.SourceType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ConnectorRegistryTest {

    @Test
    void lookupTrimsAndIgnoresCase() {
        ConnectorRegistry registry = new ConnectorRegistry(List.of(stub(SourceType.RSS)));
        assertEquals(SourceType.RSS, registry.get("  rss  ").type());
        assertNull(registry.get("  "));
        assertNull(registry.get(null));
    }

    @Test
    void duplicateTypeCodeFailsFast() {
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> new ConnectorRegistry(List.of(stub(SourceType.RSS), stub(SourceType.RSS))));
        assertEquals(true, ex.getMessage().contains("Duplicate SourceConnector typeCode RSS"));
    }

    @Test
    void descriptorsSortedById() {
        ConnectorRegistry registry = new ConnectorRegistry(List.of(
                stub(SourceType.WEB),
                stub(SourceType.RSS),
                stub(SourceType.FIXTURE)));
        List<String> ids = registry.descriptors().stream().map(ConnectorDescriptor::id).toList();
        assertEquals(List.of("FIXTURE", "RSS", "WEB"), ids);
    }

    @Test
    void blankTypeCodeFailsFast() {
        SourceConnector blank = new SourceConnector() {
            @Override
            public String typeCode() {
                return "  ";
            }

            @Override
            public SourceType type() {
                return SourceType.RSS;
            }

            @Override
            public List<RawItem> fetch(FetchContext ctx) {
                return List.of();
            }
        };
        assertThrows(IllegalStateException.class, () -> new ConnectorRegistry(List.of(blank)));
    }

    @Test
    void descriptorIdMustMatchTypeCode() {
        SourceConnector mismatch = new SourceConnector() {
            @Override
            public SourceType type() {
                return SourceType.RSS;
            }

            @Override
            public ConnectorDescriptor descriptor() {
                return ConnectorDescriptor.of("WEB", "Web", List.of());
            }

            @Override
            public List<RawItem> fetch(FetchContext ctx) {
                return List.of();
            }
        };
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> new ConnectorRegistry(List.of(mismatch)));
        assertEquals(true, ex.getMessage().contains("descriptor id \"WEB\" != typeCode RSS"));
    }

    @Test
    void blankDisplayNameFailsFast() {
        SourceConnector bad = new SourceConnector() {
            @Override
            public SourceType type() {
                return SourceType.RSS;
            }

            @Override
            public ConnectorDescriptor descriptor() {
                return ConnectorDescriptor.of("RSS", "", List.of());
            }

            @Override
            public List<RawItem> fetch(FetchContext ctx) {
                return List.of();
            }
        };
        IllegalStateException ex = assertThrows(
                IllegalStateException.class, () -> new ConnectorRegistry(List.of(bad)));
        assertEquals(true, ex.getMessage().contains("blank displayName"));
    }

    @Test
    void typeCodeWithSurroundingWhitespaceFailsFast() {
        SourceConnector bad = new SourceConnector() {
            @Override
            public String typeCode() {
                return " RSS ";
            }

            @Override
            public SourceType type() {
                return SourceType.RSS;
            }

            @Override
            public List<RawItem> fetch(FetchContext ctx) {
                return List.of();
            }
        };
        IllegalStateException ex = assertThrows(
                IllegalStateException.class, () -> new ConnectorRegistry(List.of(bad)));
        assertEquals(true, ex.getMessage().contains("typeCode() has surrounding whitespace"));
    }

    @Test
    void duplicateConfigFieldKeyFailsFast() {
        SourceConnector bad = connectorWithFields(List.of(
                ConnectorDescriptor.ConfigField.text("url", "URL", true),
                ConnectorDescriptor.ConfigField.text("URL", "Again", false)));
        IllegalStateException ex = assertThrows(
                IllegalStateException.class, () -> new ConnectorRegistry(List.of(bad)));
        assertEquals(true, ex.getMessage().contains("duplicate config field key url"));
    }

    @Test
    void configFieldKeyWithSurroundingWhitespaceFailsFast() {
        SourceConnector bad = connectorWithFields(List.of(
                ConnectorDescriptor.ConfigField.text(" url ", "URL", true)));
        IllegalStateException ex = assertThrows(
                IllegalStateException.class, () -> new ConnectorRegistry(List.of(bad)));
        assertEquals(true, ex.getMessage().contains("config field key has surrounding whitespace"));
    }

    @Test
    void blankConfigFieldTypeFailsFast() {
        SourceConnector bad = connectorWithFields(List.of(
                new ConnectorDescriptor.ConfigField("feed", "Feed", "", true)));
        IllegalStateException ex = assertThrows(
                IllegalStateException.class, () -> new ConnectorRegistry(List.of(bad)));
        assertEquals(true, ex.getMessage().contains("config field feed has a blank type"));
    }

    @Test
    void unknownConfigFieldTypeFailsFast() {
        SourceConnector bad = connectorWithFields(List.of(
                new ConnectorDescriptor.ConfigField("feed", "Feed", "number", true)));
        IllegalStateException ex = assertThrows(
                IllegalStateException.class, () -> new ConnectorRegistry(List.of(bad)));
        assertEquals(true, ex.getMessage().contains("unknown type \"number\""));
    }

    @Test
    void knownConfigFieldTypesAccepted() {
        new ConnectorRegistry(List.of(connectorWithFields(List.of(
                ConnectorDescriptor.ConfigField.text("a", "A", false),
                ConnectorDescriptor.ConfigField.path("b", "B", false),
                ConnectorDescriptor.ConfigField.secret("c", "C", false),
                ConnectorDescriptor.ConfigField.textarea("d", "D", false)))));
    }

    private static SourceConnector connectorWithFields(List<ConnectorDescriptor.ConfigField> fields) {
        return new SourceConnector() {
            @Override
            public SourceType type() {
                return SourceType.RSS;
            }

            @Override
            public ConnectorDescriptor descriptor() {
                return ConnectorDescriptor.of("RSS", "RSS", fields);
            }

            @Override
            public List<RawItem> fetch(FetchContext ctx) {
                return List.of();
            }
        };
    }

    private static SourceConnector stub(SourceType type) {
        return new SourceConnector() {
            @Override
            public SourceType type() {
                return type;
            }

            @Override
            public List<RawItem> fetch(FetchContext ctx) {
                return List.of();
            }
        };
    }
}
