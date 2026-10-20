package com.airadar.api;

import com.airadar.domain.NewsItem;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;

/**
 * Opaque keyset cursor for {@code GET /api/items}: {@code readFlag|score|id}.
 * Sort contract: unread first ({@code read=false}), then score DESC, then id DESC.
 */
public final class ItemListCursor {

    private final boolean read;
    private final double score;
    private final long id;

    public ItemListCursor(boolean read, double score, long id) {
        this.read = read;
        this.score = score;
        this.id = id;
    }

    public boolean isRead() {
        return read;
    }

    public double getScore() {
        return score;
    }

    public long getId() {
        return id;
    }

    public static ItemListCursor fromItem(NewsItem item) {
        double score = item.getScore() != null ? item.getScore() : Double.NEGATIVE_INFINITY;
        long id = item.getId() != null ? item.getId() : 0L;
        return new ItemListCursor(item.isRead(), score, id);
    }

    public String encode() {
        String raw = (read ? "1" : "0") + "|" + Double.toString(score) + "|" + id;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    public static Optional<ItemListCursor> decode(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(token.trim()), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", 3);
            if (parts.length != 3) {
                return Optional.empty();
            }
            boolean read = "1".equals(parts[0]);
            double score = Double.parseDouble(parts[1]);
            long id = Long.parseLong(parts[2]);
            return Optional.of(new ItemListCursor(read, score, id));
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    /** True when {@code item} sorts strictly after this cursor (should be included in next page). */
    public boolean isBefore(NewsItem item) {
        boolean itemRead = item.isRead();
        if (itemRead != read) {
            // unread (false) sorts before read (true)
            return Boolean.compare(itemRead, read) > 0;
        }
        double itemScore = item.getScore() != null ? item.getScore() : Double.NEGATIVE_INFINITY;
        int scoreCmp = Double.compare(itemScore, score);
        if (scoreCmp != 0) {
            // higher score sorts first → after cursor means lower score
            return scoreCmp < 0;
        }
        long itemId = item.getId() != null ? item.getId() : 0L;
        return Long.compare(itemId, id) < 0;
    }
}
