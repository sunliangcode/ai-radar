package com.airadar.maintenance;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * One-shot / on-demand cleanup of {@code news_items} that share an exact title
 * but different URLs. Keeps the best row per title and rewires related tables.
 */
@Service
public class DuplicateTitleCleanupService {

    private static final Logger log = LoggerFactory.getLogger(DuplicateTitleCleanupService.class);

    private final JdbcTemplate jdbc;

    public DuplicateTitleCleanupService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public Map<String, Object> run() {
        List<String> duplicateTitles = jdbc.queryForList("""
                SELECT title FROM news_items
                WHERE title IS NOT NULL
                  AND TRIM(title) <> ''
                  AND title <> canonical_url
                GROUP BY title
                HAVING COUNT(*) > 1
                """, String.class);

        int groups = duplicateTitles.size();
        int deletedItems = 0;
        List<Long> keptIds = new ArrayList<>();

        for (String title : duplicateTitles) {
            List<Row> rows = jdbc.query("""
                    SELECT id, COALESCE(saved, 0) AS saved, score, summary, title_display
                    FROM news_items
                    WHERE title = ?
                    """,
                    (rs, i) -> new Row(
                            rs.getLong("id"),
                            rs.getInt("saved") != 0,
                            (Double) rs.getObject("score"),
                            rs.getString("summary"),
                            rs.getString("title_display")
                    ),
                    title);

            if (rows.size() < 2) {
                continue;
            }

            Row keeper = pickKeeper(rows);
            keptIds.add(keeper.id());

            for (Row loser : rows) {
                if (loser.id() == keeper.id()) {
                    continue;
                }
                rewireToKeeper(loser.id(), keeper.id());
                jdbc.update("DELETE FROM news_items WHERE id = ?", loser.id());
                deletedItems++;
            }
        }

        if (deletedItems > 0) {
            try {
                jdbc.execute("VACUUM");
            } catch (Exception e) {
                log.warn("duplicate_title_vacuum_failed error={}", e.getMessage());
            }
        }

        log.info("duplicate_title_cleanup groups={} deletedItems={} kept={}", groups, deletedItems, keptIds.size());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("groups", groups);
        out.put("deletedItems", deletedItems);
        out.put("keptCount", keptIds.size());
        out.put("keptIds", keptIds.size() <= 50 ? keptIds : keptIds.subList(0, 50));
        return out;
    }

    private void rewireToKeeper(long loserId, long keeperId) {
        // event_items: UNIQUE(event_id, news_item_id) — drop loser link if keeper already present
        jdbc.update("""
                DELETE FROM event_items
                WHERE news_item_id = ?
                  AND event_id IN (SELECT event_id FROM event_items WHERE news_item_id = ?)
                """, loserId, keeperId);
        jdbc.update("UPDATE event_items SET news_item_id = ? WHERE news_item_id = ?", keeperId, loserId);

        jdbc.update("UPDATE timeline_entries SET news_item_id = ? WHERE news_item_id = ?", keeperId, loserId);

        jdbc.update("UPDATE recommended_actions SET news_item_id = ? WHERE news_item_id = ?", keeperId, loserId);

        jdbc.update("UPDATE preference_keywords SET item_id = ? WHERE item_id = ?", keeperId, loserId);

        jdbc.update("DELETE FROM event_cluster_log WHERE news_item_id = ?", loserId);
    }

    /**
     * Prefer saved, then higher score, then has summary, then has title_display, then smaller id.
     */
    static Row pickKeeper(List<Row> rows) {
        return rows.stream()
                .min(Comparator
                        .comparing((Row r) -> !r.saved())
                        .thenComparing(r -> r.score() == null ? Double.NEGATIVE_INFINITY : r.score(),
                                Comparator.reverseOrder())
                        .thenComparing(r -> !hasText(r.summary()))
                        .thenComparing(r -> !hasText(r.titleDisplay()))
                        .thenComparingLong(Row::id))
                .orElseThrow();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    record Row(long id, boolean saved, Double score, String summary, String titleDisplay) {
    }
}
