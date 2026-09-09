package com.airadar.provider.ai;

/**
 * One structured item extracted from a web page or email body.
 */
public record ExtractedItem(
        String title,
        String url,
        String content
) {
}
