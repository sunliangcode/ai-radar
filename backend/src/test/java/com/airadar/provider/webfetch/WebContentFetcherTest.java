package com.airadar.provider.webfetch;

import com.airadar.config.RadarProperties;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertFalse;

class WebContentFetcherTest {

    @Test
    void disabledByDefault() {
        RadarProperties props = new RadarProperties();
        WebContentFetcher fetcher = new WebContentFetcher(RestClient.builder(), props);
        assertFalse(fetcher.isEnabled());
        assertNull(fetcher.fetchArticleText("https://example.com"));
    }

    @Test
    void blocksLocalhostEvenWhenEnabled() {
        RadarProperties props = new RadarProperties();
        props.getWebFetch().setEnabled(true);
        WebContentFetcher fetcher = new WebContentFetcher(RestClient.builder(), props);
        assertNull(fetcher.fetchArticleText("http://127.0.0.1/secret"));
        assertNull(fetcher.fetchArticleText("http://localhost/admin"));
    }
}
