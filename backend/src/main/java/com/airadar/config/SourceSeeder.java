package com.airadar.config;

import com.airadar.packs.PackImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Seeds an empty database from pack JSON (single source of truth under {@code packs/sources/}).
 */
@Component
public class SourceSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SourceSeeder.class);

    /** Default packs imported on first boot when the sources table is empty. */
    private static final List<String> DEFAULT_PACKS = List.of("ai-core", "ai-cn");

    private final PackImportService packImportService;
    private final com.airadar.persistence.SourceRepository sourceRepository;

    public SourceSeeder(
            PackImportService packImportService,
            com.airadar.persistence.SourceRepository sourceRepository
    ) {
        this.packImportService = packImportService;
        this.sourceRepository = sourceRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (sourceRepository.count() > 0) {
            return;
        }
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
}
