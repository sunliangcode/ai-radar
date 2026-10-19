package com.airadar.config;

import com.airadar.api.ConnectorsController;
import com.airadar.api.DeliveryChannelsController;
import io.swagger.v3.oas.annotations.Operation;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SpiCatalogBlurbsTest {

    @Test
    void operationSummariesEmbedExpectLists() {
        assertTrue(SpiCatalogBlurbs.CONNECTOR_OPERATION_SUMMARY.contains(SpiCatalogBlurbs.CONNECTOR_EXPECT));
        assertTrue(SpiCatalogBlurbs.CONNECTOR_OPERATION_SUMMARY.contains("field types text/path/secret/textarea"));
        assertTrue(SpiCatalogBlurbs.DELIVERY_OPERATION_SUMMARY.contains(SpiCatalogBlurbs.DELIVERY_EXPECT));
        assertTrue(SpiCatalogBlurbs.CONNECTOR_EXPECT.contains("FIXTURE/path"));
        assertTrue(SpiCatalogBlurbs.CONNECTOR_EXPECT.contains("BILIBILI/cliPath"));
        assertTrue(SpiCatalogBlurbs.DELIVERY_EXPECT.contains("outbox/radar.delivery.outbox-enabled"));
        assertTrue(SpiCatalogBlurbs.DELIVERY_EXPECT.contains("feishu/FEISHU_WEBHOOK_URL"));
    }

    @Test
    void controllersWireOperationSummariesFromBlurbs() throws Exception {
        Method connectors = ConnectorsController.class.getMethod("list");
        Method delivery = DeliveryChannelsController.class.getMethod("list");
        assertEquals(
                SpiCatalogBlurbs.CONNECTOR_OPERATION_SUMMARY,
                connectors.getAnnotation(Operation.class).summary());
        assertEquals(
                SpiCatalogBlurbs.DELIVERY_OPERATION_SUMMARY,
                delivery.getAnnotation(Operation.class).summary());
    }
}
