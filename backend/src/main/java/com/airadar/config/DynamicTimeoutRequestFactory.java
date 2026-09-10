package com.airadar.config;

import org.springframework.http.HttpMethod;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.io.IOException;
import java.net.URI;

/**
 * Builds a fresh request factory per call so Settings-driven timeouts apply immediately.
 */
public class DynamicTimeoutRequestFactory implements ClientHttpRequestFactory {

    private final RadarProperties properties;

    public DynamicTimeoutRequestFactory(RadarProperties properties) {
        this.properties = properties;
    }

    @Override
    public ClientHttpRequest createRequest(URI uri, HttpMethod httpMethod) throws IOException {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int readTimeout = clamp(properties.getFetchTimeoutMs(), 5_000, 300_000);
        int connectTimeout = Math.min(15_000, readTimeout);
        factory.setConnectTimeout(connectTimeout);
        factory.setReadTimeout(readTimeout);
        return factory.createRequest(uri, httpMethod);
    }

    private static int clamp(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }
}
