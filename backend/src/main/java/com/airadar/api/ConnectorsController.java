package com.airadar.api;

import com.airadar.connector.ConnectorDescriptor;
import com.airadar.connector.ConnectorRegistry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/connectors")
public class ConnectorsController {

    private final ConnectorRegistry connectorRegistry;

    public ConnectorsController(ConnectorRegistry connectorRegistry) {
        this.connectorRegistry = connectorRegistry;
    }

    @GetMapping
    public List<ConnectorDescriptor> list() {
        return connectorRegistry.descriptors();
    }
}
