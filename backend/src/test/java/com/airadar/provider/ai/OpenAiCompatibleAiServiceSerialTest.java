package com.airadar.provider.ai;

import com.airadar.config.RadarProperties;
import com.airadar.interest.InterestSignalsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OpenAiCompatibleAiServiceSerialTest {

    private MockWebServer server;
    private OpenAiCompatibleAiService service;

    @BeforeEach
    void setUp() throws Exception {
        server = new MockWebServer();
        server.start();

        RadarProperties props = new RadarProperties();
        props.getOpenai().setBaseUrl(server.url("v1").toString().replaceAll("/$", ""));
        props.getOpenai().setApiKey("sk-test");
        props.getOpenai().setModel("test-model");
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
    void secondHttpCallWaitsUntilFirstReleasesGate() throws Exception {
        AtomicInteger inFlight = new AtomicInteger();
        AtomicInteger maxInFlight = new AtomicInteger();

        server.setDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                int n = inFlight.incrementAndGet();
                maxInFlight.updateAndGet(m -> Math.max(m, n));
                try {
                    Thread.sleep(120);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    inFlight.decrementAndGet();
                }
                // localhost → streaming path
                String sse = "data: {\"choices\":[{\"delta\":{\"content\":\"{\\\"keyword\\\":\\\"k\\\"}\"}}]}\n\n"
                        + "data: [DONE]\n\n";
                return new MockResponse()
                        .setResponseCode(200)
                        .addHeader("Content-Type", "text/event-stream")
                        .setBody(sse);
            }
        });

        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Runnable task = () -> {
                try {
                    start.await(2, TimeUnit.SECONDS);
                    service.extractPreferenceKeyword("title", "summary", "like");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            };
            pool.execute(task);
            pool.execute(task);
            start.countDown();
            assertTrue(done.await(10, TimeUnit.SECONDS));
            assertEquals(2, server.getRequestCount());
            assertEquals(1, maxInFlight.get(), "LLM HTTP must be single-flight");

            RecordedRequest first = server.takeRequest(1, TimeUnit.SECONDS);
            String reqBody = first != null ? first.getBody().readUtf8() : "";
            assertTrue(reqBody.contains("\"keep_alive\":\"5m\""),
                    "local Ollama stream requests should pin keep_alive");
            assertTrue(reqBody.contains("\"num_ctx\":4096") || reqBody.contains("\"num_ctx\": 4096"),
                    "local Ollama stream requests should send options.num_ctx");
        } finally {
            pool.shutdownNow();
        }
    }
}
