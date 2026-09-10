package com.airadar.provider.ai;

import com.airadar.config.RadarProperties;
import com.airadar.interest.InterestSignalsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OpenAiCompatibleAiServiceRetryTest {

    private MockWebServer server;
    private OpenAiCompatibleAiService service;
    private RadarProperties props;

    @BeforeEach
    void setUp() throws Exception {
        server = new MockWebServer();
        server.start();

        props = new RadarProperties();
        props.getOpenai().setBaseUrl(server.url("v1").toString().replaceAll("/$", ""));
        props.getOpenai().setApiKey("sk-test");
        props.getOpenai().setModel("test-model");
        props.getOpenai().setMaxRetries(2);
        props.getOpenai().setRetryBackoffMs(10L);
        props.setSummaryLanguage("en");

        InterestSignalsService interest = mock(InterestSignalsService.class);
        when(interest.effectiveInterestProfile()).thenReturn("LLM");
        when(interest.effectiveDislikeProfile()).thenReturn("");

        service = new OpenAiCompatibleAiService(
                RestClient.builder(),
                new ObjectMapper(),
                props,
                interest,
                new AiCallMonitor(),
                new AiCallGate()
        );
    }

    @AfterEach
    void tearDown() throws Exception {
        server.shutdown();
    }

    @Test
    void isRetryableAiError_classifiesTransientVsPermanent() {
        assertTrue(OpenAiCompatibleAiService.isRetryableAiError(new SocketTimeoutException("read timed out")));
        assertTrue(OpenAiCompatibleAiService.isRetryableAiError(new RuntimeException("HTTP 503 Service Unavailable")));
        assertTrue(OpenAiCompatibleAiService.isRetryableAiError(new RuntimeException("429 Too Many Requests")));
        assertFalse(OpenAiCompatibleAiService.isRetryableAiError(new RuntimeException("401 Unauthorized")));
        assertFalse(OpenAiCompatibleAiService.isRetryableAiError(new RuntimeException("400 Bad Request")));
    }

    @Test
    void retriesTransientFailureThenSucceeds() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(503).setBody("busy"));
        String sse = "data: {\"choices\":[{\"delta\":{\"content\":\"{\\\"keyword\\\":\\\"agents\\\"}\"}}]}\n\n"
                + "data: [DONE]\n\n";
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .addHeader("Content-Type", "text/event-stream")
                .setBody(sse));

        String keyword = service.extractPreferenceKeyword("title", "summary", "like");
        assertEquals("agents", keyword);
        assertEquals(2, server.getRequestCount());
        assertTrue(server.takeRequest(1, TimeUnit.SECONDS) != null);
        assertTrue(server.takeRequest(1, TimeUnit.SECONDS) != null);
    }
}
