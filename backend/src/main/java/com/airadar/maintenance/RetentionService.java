package com.airadar.maintenance;

import com.airadar.persistence.NewsItemRepository;
import com.airadar.settings.SettingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Deletes old feed noise so SQLite stays small on a personal box.
 *
 * <p>Policy: items older than {@code retentionDays} are removed only when they are
 * <strong>not saved</strong> and <strong>not linked to any event</strong>. Unread is fair game —
 * 90-day unread is abandoned, not a backlog. {@code retentionDays <= 0} (default) disables cleanup.
 */
@Service
public class RetentionService {

    private static final Logger log = LoggerFactory.getLogger(RetentionService.class);

    private final SettingsService settingsService;
    private final JdbcTemplate jdbc;
    private final NewsItemRepository newsItemRepository;

    public RetentionService(
            SettingsService settingsService,
            JdbcTemplate jdbc,
            NewsItemRepository newsItemRepository
    ) {
        this.settingsService = settingsService;
        this.jdbc = jdbc;
        this.newsItemRepository = newsItemRepository;
    }

    @Transactional
    public Map<String, Object> run() {
        Integer days = settingsService.effective().retentionDays();
        if (days == null || days <= 0) {
            return Map.of(
                    "enabled", false,
                    "retentionDays", 0,
                    "deletedItems", 0,
                    "deletedDeliverySent", 0
            );
        }

        Instant cutoff = Instant.now().minus(days, ChronoUnit.DAYS);
        String cutoffIso = cutoff.toString();

        int deletedItems = jdbc.update("""
                DELETE FROM news_items
                WHERE created_at < ?
                  AND COALESCE(saved, 0) = 0
                  AND id NOT IN (SELECT news_item_id FROM event_items)
                """, cutoffIso);
        int deletedSent = jdbc.update("DELETE FROM delivery_sent WHERE created_at < ?", cutoffIso);

        // SQLite keeps free pages until VACUUM; only bother when we actually freed something.
        if (deletedItems + deletedSent > 0) {
            try {
                jdbc.execute("VACUUM");
            } catch (Exception e) {
                log.warn("retention_vacuum_failed error={}", e.getMessage());
            }
        }

        long remaining = newsItemRepository.count();
        log.info("retention_done days={} cutoff={} deletedItems={} deletedSent={} remaining={}",
                days, cutoffIso, deletedItems, deletedSent, remaining);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("enabled", true);
        out.put("retentionDays", days);
        out.put("cutoff", cutoffIso);
        out.put("deletedItems", deletedItems);
        out.put("deletedDeliverySent", deletedSent);
        out.put("remainingItems", remaining);
        return out;
    }

    /** Exposed for tests: cutoff instant for a retention window. */
    static Instant cutoffFor(int days, Instant now) {
        return now.minus(Math.max(0, days), ChronoUnit.DAYS);
    }
}
