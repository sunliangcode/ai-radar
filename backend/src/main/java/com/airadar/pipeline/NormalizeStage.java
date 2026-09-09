package com.airadar.pipeline;

import com.airadar.config.RadarProperties;
import com.airadar.domain.ItemStatus;
import com.airadar.domain.NewsItem;
import com.airadar.domain.RawItem;
import com.airadar.domain.UrlNormalizer;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

public final class NormalizeStage {

    private static final int PRESERVE_FULL_TEXT_MAX = 50_000;

    private NormalizeStage() {
    }

    public static List<NewsItem> normalize(List<RawItem> rawItems, RadarProperties properties) {
        List<NewsItem> items = new ArrayList<>();
        int maxSnippet = properties.getMaxSnippetChars();
        Instant now = Instant.now();
        for (RawItem raw : rawItems) {
            if (raw.url() == null || raw.url().isBlank()) {
                continue;
            }
            String canonical = UrlNormalizer.canonicalize(raw.url());
            if (canonical.isBlank()) {
                continue;
            }
            boolean preserveFullText = isPreserveFullText(raw);
            int snippetCap = preserveFullText ? Math.max(maxSnippet, PRESERVE_FULL_TEXT_MAX) : maxSnippet;
            String cleaned = preserveFullText ? cleanPreservingNewlines(raw.contentSnippet()) : cleanText(raw.contentSnippet());
            NewsItem item = new NewsItem();
            item.setCanonicalUrl(canonical);
            item.setTitle(cleanTitle(raw.title(), canonical));
            Instant published = raw.publishedAt() == null ? now : raw.publishedAt().atZone(ZoneOffset.UTC).toInstant();
            item.setPublishedAt(published);
            item.setContentSnippet(truncate(cleaned, snippetCap));
            item.setPrimarySourceType(raw.sourceType());
            item.setPrimarySourceId(raw.sourceId());
            item.getSourceRefs().add(raw.sourceType().name() + ":" + raw.sourceId());
            item.setRawMeta(raw.rawMeta());
            item.setStatus(ItemStatus.NEW);
            item.setCreatedAt(now);
            item.setUpdatedAt(now);
            items.add(item);
        }
        return items;
    }

    private static boolean isPreserveFullText(RawItem raw) {
        if (raw.rawMeta() == null) {
            return false;
        }
        Object flag = raw.rawMeta().get("preserveFullText");
        return Boolean.TRUE.equals(flag) || "true".equalsIgnoreCase(String.valueOf(flag));
    }

    private static String cleanTitle(String title, String fallback) {
        String cleaned = cleanText(title);
        return cleaned.isBlank() ? fallback : cleaned;
    }

    private static String cleanText(String text) {
        if (text == null) {
            return "";
        }
        return text.replace('\u0000', ' ').replaceAll("\\s+", " ").trim();
    }

    private static String cleanPreservingNewlines(String text) {
        if (text == null) {
            return "";
        }
        return text.replace('\u0000', ' ')
                .replaceAll("[ \\t\\x0B\\f]+", " ")
                .replaceAll(" *\\n *", "\n")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }

    private static String truncate(String text, int max) {
        if (text.length() <= max) {
            return text;
        }
        return text.substring(0, max);
    }
}
