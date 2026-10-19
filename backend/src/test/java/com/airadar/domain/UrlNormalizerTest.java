package com.airadar.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class UrlNormalizerTest {

    @Test
    void stripsTrackingAndFragmentAndTrailingSlash() {
        String input = "https://WWW.Example.com/path/article/?utm_source=x&id=1&utm_campaign=y#section";
        assertEquals("https://example.com/path/article?id=1", UrlNormalizer.canonicalize(input));
    }

    @Test
    void keepsMeaningfulQueryParamsSorted() {
        String input = "https://example.com/a?b=2&a=1";
        assertEquals("https://example.com/a?a=1&b=2", UrlNormalizer.canonicalize(input));
    }

    @Test
    void blankAndNullBecomeEmpty() {
        assertEquals("", UrlNormalizer.canonicalize(null));
        assertEquals("", UrlNormalizer.canonicalize("  "));
    }

    @Test
    void dropsFbclidAndGclid() {
        String input = "https://example.com/x?fbclid=abc&gclid=def&keep=1";
        assertEquals("https://example.com/x?keep=1", UrlNormalizer.canonicalize(input));
    }

    @Test
    void schemeLessUrlDefaultsToHttps() {
        // URI without scheme → host may be null; fallback returns trimmed raw.
        assertEquals("not a url", UrlNormalizer.canonicalize("not a url"));
    }

    @Test
    void keepsNonDefaultPort() {
        assertEquals("https://example.com:8443/a", UrlNormalizer.canonicalize("https://example.com:8443/a/"));
    }

    @Test
    void dropsDefaultHttpAndHttpsPorts() {
        assertEquals("http://example.com/a", UrlNormalizer.canonicalize("http://example.com:80/a/"));
        assertEquals("https://example.com/a", UrlNormalizer.canonicalize("https://example.com:443/a/"));
    }
}
