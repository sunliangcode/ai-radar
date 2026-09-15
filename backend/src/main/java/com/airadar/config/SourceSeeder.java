package com.airadar.config;

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
 * Seeds an empty database from pack JSON, then ensures a Zhihu source exists.
 * Zhihu stays portable: default-enable only when the local CLI binary is present.
 */
@Component
public class SourceSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SourceSeeder.class);

    /** Default packs imported on first boot when the sources table is empty. */
    private static final List<String> DEFAULT_PACKS = List.of("ai-core", "ai-cn");

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
        ensureZhihu();
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
