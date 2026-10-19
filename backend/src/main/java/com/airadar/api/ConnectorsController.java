package com.airadar.api;

import com.airadar.config.SpiCatalogBlurbs;
import com.airadar.connector.ConnectorDescriptor;
import com.airadar.connector.ConnectorRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/connectors")
@Tag(name = "Connectors", description = "Source connector SPI catalog")
public class ConnectorsController {

    private final ConnectorRegistry connectorRegistry;

    public ConnectorsController(ConnectorRegistry connectorRegistry) {
        this.connectorRegistry = connectorRegistry;
    }

    @GetMapping
    @Operation(summary = SpiCatalogBlurbs.CONNECTOR_OPERATION_SUMMARY)
    public List<ConnectorDescriptor> list() {
        return connectorRegistry.descriptors();
    }
}
