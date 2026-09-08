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
}
