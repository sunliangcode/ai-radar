package com.airadar.config;

import com.airadar.connector.BilibiliConnector;
import com.airadar.connector.OpenSourceCliRunner;
import com.airadar.connector.WeiboConnector;
import com.airadar.connector.ZhihuConnector;
import com.airadar.domain.SourceType;
import com.airadar.packs.PackImportService;
import com.airadar.persistence.SourceEntity;
import com.airadar.persistence.SourceRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

/**
 * Seeds an empty database from pack JSON, then ensures open-source domestic CLIs exist.
 * Homemade HTTP scrapers (Juejin/CSDN) are disabled when present — no OSS connector.
 */
@Component
public class SourceSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SourceSeeder.class);

    /** Default pack on first boot — CN programmer reading first; import ai-core via UI if needed. */
    private static final List<String> DEFAULT_PACKS = List.of("ai-cn");

    private final PackImportService packImportService;
    private final SourceRepository sourceRepository;
    private final ObjectMapper objectMapper;

    public SourceSeeder(
            PackImportService packImportService,
            SourceRepository sourceRepository,
            ObjectMapper objectMapper
    ) {
        this.packImportService = packImportService;
        this.sourceRepository = sourceRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (sourceRepository.count() == 0) {
            log.info("Seeding default sources from packs {}", DEFAULT_PACKS);
            for (String packId : DEFAULT_PACKS) {
                try {
                    Map<String, Object> result = packImportService.importPack(packId, null);
                    log.info("seeded pack={} created={} updated={}",
                            packId, result.get("created"), result.get("updated"));
                } catch (Exception e) {
                    log.warn("seed_pack_failed pack={} error={}", packId, e.getMessage());
                }
            }
        }
        disableRemovedConnectors(SourceType.JUEJIN, SourceType.CSDN);
        ensureZhihu();
        ensureOpenSourceCli(
                SourceType.WEIBO,
                WeiboConnector.DEFAULT_SOURCE_NAME,
                WeiboConnector.preferredCliPath(),
                WeiboConnector.DEFAULT_LIMIT
        );
        ensureOpenSourceCli(
                SourceType.BILIBILI,
                BilibiliConnector.DEFAULT_SOURCE_NAME,
                BilibiliConnector.preferredCliPath(),
                BilibiliConnector.DEFAULT_LIMIT
        );
        // Extra CN tech RSS — also in ai-cn pack; ensure so upgrades get them without wipe.
        ensureNamedRss("IT之家", "https://www.ithome.com/rss/");
        ensureNamedRss("Solidot", "https://www.solidot.org/index.rss");
        ensureNamedRss("极客公园", "https://www.geekpark.net/rss");
        ensureNamedRss("爱范儿", "https://www.ifanr.com/feed");
        ensureNamedRss("虎嗅", "https://rss.huxiu.com/");
        ensureNamedRss("InfoQ 中国", "https://www.infoq.cn/feed");
        ensureNamedRss("钛媒体", "https://www.tmtpost.com/feed");
        ensureNamedRss("雷峰网", "https://www.leiphone.com/feed");
        ensureNamedRss("掘金", "https://juejin.cn/rss");
        ensureNamedRss("新浪科技", "https://rss.sina.com.cn/tech/rollnews.xml");
        ensureNamedRss("人人都是产品经理", "https://www.woshipm.com/feed");
        ensureNamedRss("HelloGitHub", "https://hellogithub.com/rss");
        ensureNamedRss("SegmentFault", "https://segmentfault.com/feeds");
        ensureNamedRss("数英", "https://www.digitaling.com/rss");
        ensureNamedRss("数字尾巴", "https://www.dgtle.com/rss/dgtle.xml");
        repairNamedRssFeedUrl("36氪", "https://36kr.com/feed", "https://www.36kr.com/feed");
    }

    /** Repair a known-broken feed URL for an existing named RSS source. */
    void repairNamedRssFeedUrl(String name, String brokenFeedUrl, String fixedFeedUrl) {
        try {
            sourceRepository.findFirstByName(name).ifPresent(entity -> {
                if (entity.getType() != SourceType.RSS) {
                    return;
                }
                try {
                    String raw = entity.getConfigJson();
                    if (raw == null || raw.isBlank()) {
                        return;
                    }
                    JsonNode parsed = objectMapper.readTree(raw);
                    if (!parsed.isObject()) {
                        return;
                    }
                    ObjectNode config = (ObjectNode) parsed;
                    String current = config.path("feedUrl").asText(config.path("url").asText("")).trim();
                    if (!brokenFeedUrl.equals(current)) {
                        return;
                    }
                    config.put("feedUrl", fixedFeedUrl);
                    config.remove("url");
                    entity.setConfigJson(objectMapper.writeValueAsString(config));
                    sourceRepository.save(entity);
                    log.info("repaired_rss_feed name={} from={} to={}", name, brokenFeedUrl, fixedFeedUrl);
                } catch (Exception e) {
                    log.warn("repair_rss_feed_failed name={} error={}", name, e.getMessage());
                }
            });
        } catch (Exception e) {
            log.warn("repair_rss_feed_lookup_failed name={} error={}", name, e.getMessage());
        }
    }

    /** Disable homemade connectors that were removed (no open-source project). */
    void disableRemovedConnectors(SourceType... types) {
        for (SourceType type : types) {
            try {
                sourceRepository.findFirstByType(type).ifPresent(entity -> {
                    if (!entity.isEnabled()) {
                        return;
                    }
                    entity.setEnabled(false);
                    sourceRepository.save(entity);
                    log.info("disabled_removed_connector type={} id={}", type, entity.getId());
                });
            } catch (Exception e) {
                log.warn("disable_removed_connector_failed type={} error={}", type, e.getMessage());
            }
        }
    }

    /**
     * Create WEIBO / BILIBILI if missing. Enabled only when the preferred CLI binary exists.
     * Never flips an existing enabled flag; never overwrites a working custom cliPath.
     */
    void ensureOpenSourceCli(SourceType type, String name, String preferredCli, int defaultLimit) {
        ensureOpenSourceCli(type, name, preferredCli, defaultLimit, OpenSourceCliRunner::isExecutable);
    }

    void ensureOpenSourceCli(
            SourceType type,
            String name,
            String preferredCli,
            int defaultLimit,
            Predicate<String> executable
    ) {
        try {
            boolean preferredReady = executable.test(preferredCli);
            SourceEntity entity = sourceRepository.findFirstByType(type).orElseGet(SourceEntity::new);
            boolean isNew = entity.getId() == null;
            if (isNew) {
                entity.setName(name);
                entity.setType(type);
                entity.setEnabled(preferredReady);
                ObjectNode config = objectMapper.createObjectNode();
                config.put("cliPath", preferredCli);
                config.put("limit", defaultLimit);
                entity.setConfigJson(objectMapper.writeValueAsString(config));
                sourceRepository.save(entity);
                log.info("ensured_cli_source type={} created=true enabled={} cliReady={} cliPath={}",
                        type, preferredReady, preferredReady, preferredCli);
                return;
            }
            if (repairCliPath(entity, preferredCli, preferredReady, executable)) {
                sourceRepository.save(entity);
                log.info("ensured_cli_source type={} created=false cliPath_repaired=true id={} cliPath={}",
                        type, entity.getId(), preferredCli);
            }
        } catch (Exception e) {
            log.warn("ensure_cli_source_failed type={} error={}", type, e.getMessage());
        }
    }

    /** Create an RSS source by name if missing. Leaves existing rows alone. */
    void ensureNamedRss(String name, String feedUrl) {
        try {
            if (sourceRepository.findFirstByName(name).isPresent()) {
                return;
            }
            SourceEntity entity = new SourceEntity();
            entity.setName(name);
            entity.setType(SourceType.RSS);
            entity.setEnabled(true);
            entity.setConfigJson(objectMapper.writeValueAsString(Map.of("feedUrl", feedUrl)));
            sourceRepository.save(entity);
            log.info("ensured_rss_source name={} created=true", name);
        } catch (Exception e) {
            log.warn("ensure_rss_source_failed name={} error={}", name, e.getMessage());
        }
    }

    /**
     * Every boot: create 「知乎推荐」 if missing. New sources are enabled only when the
     * preferred CLI is executable. Never force-enable, and never overwrite a working
     * custom {@code cliPath}.
     */
    void ensureZhihu() {
        ensureZhihu(ZhihuConnector.preferredCliPath(), ZhihuConnector::isCliExecutable);
    }

    void ensureZhihu(String preferredCli, Predicate<String> executable) {
        try {
            boolean preferredReady = executable.test(preferredCli);
            SourceEntity entity = sourceRepository.findFirstByType(SourceType.ZHIHU)
                    .orElseGet(SourceEntity::new);
            boolean isNew = entity.getId() == null;
            if (isNew) {
                entity.setName(ZhihuConnector.DEFAULT_SOURCE_NAME);
                entity.setType(SourceType.ZHIHU);
                entity.setEnabled(preferredReady);
                entity.setConfigJson(newZhihuConfigJson(preferredCli));
                sourceRepository.save(entity);
                log.info("ensured_zhihu_source created=true enabled={} cliReady={} cliPath={}",
                        preferredReady, preferredReady, preferredCli);
                return;
            }
            if (repairCliPath(entity, preferredCli, preferredReady, executable)) {
                sourceRepository.save(entity);
                log.info("ensured_zhihu_source created=false cliPath_repaired=true id={} cliPath={}",
                        entity.getId(), preferredCli);
            }
        } catch (Exception e) {
            log.warn("ensure_zhihu_failed error={}", e.getMessage());
        }
    }

    private String newZhihuConfigJson(String preferredCli) throws Exception {
        ObjectNode config = objectMapper.createObjectNode();
        config.put("cliPath", preferredCli);
        config.put("limit", ZhihuConnector.DEFAULT_LIMIT);
        config.put("commentLimit", ZhihuConnector.DEFAULT_COMMENT_LIMIT);
        return objectMapper.writeValueAsString(config);
    }

    /**
     * Fill a blank path, or replace a path that does not exist when a preferred binary is ready.
     * Leaves a working custom path alone.
     *
     * @return true if config was changed
     */
    private boolean repairCliPath(
            SourceEntity entity,
            String preferredCli,
            boolean preferredReady,
            Predicate<String> executable
    ) throws Exception {
        String raw = entity.getConfigJson();
        ObjectNode config;
        if (raw == null || raw.isBlank()) {
            config = objectMapper.createObjectNode();
        } else {
            JsonNode parsed = objectMapper.readTree(raw);
            config = parsed.isObject() ? (ObjectNode) parsed : objectMapper.createObjectNode();
        }
        String current = config.path("cliPath").asText("").trim();
        boolean currentReady = executable.test(current);
        if (currentReady) {
            return false;
        }
        if (!preferredReady) {
            return false;
        }
        if (preferredCli.equals(current)) {
            return false;
        }
        config.put("cliPath", preferredCli);
        entity.setConfigJson(objectMapper.writeValueAsString(config));
        return true;
    }
}
