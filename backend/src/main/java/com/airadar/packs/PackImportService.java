package com.airadar.packs;

import com.airadar.domain.SourceType;
import com.airadar.persistence.SourceEntity;
import com.airadar.persistence.SourceRepository;
import com.airadar.settings.SettingsService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PackImportService {

    private final SourceRepository sourceRepository;
    private final SettingsService settingsService;
    private final ObjectMapper objectMapper;

    public PackImportService(
            SourceRepository sourceRepository,
            SettingsService settingsService,
            ObjectMapper objectMapper
    ) {
        this.sourceRepository = sourceRepository;
        this.settingsService = settingsService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Object> importPack(String packId, String path) {
        Path root = Path.of("packs");
        if (!Files.isDirectory(root) && Files.isDirectory(Path.of("../packs"))) {
            root = Path.of("../packs");
        }
        Path sourcesPath;
        Path profilePath = null;
        if (path != null && !path.isBlank()) {
            sourcesPath = Path.of(path);
        } else {
            String id = packId == null || packId.isBlank() ? "ai-core" : packId;
            sourcesPath = root.resolve("sources").resolve(id + ".json");
            Path profileCandidate = root.resolve("profiles").resolve(
                    "ai-core".equals(id) ? "builder.md" : id + ".md");
            if (Files.isRegularFile(profileCandidate)) {
                profilePath = profileCandidate;
            } else if (Files.isRegularFile(root.resolve("profiles/builder.md"))) {
                profilePath = root.resolve("profiles/builder.md");
            }
        }
        if (!Files.isRegularFile(sourcesPath)) {
            throw new IllegalArgumentException("pack sources not found: " + sourcesPath.toAbsolutePath());
        }

        try {
            JsonNode arr = objectMapper.readTree(Files.readString(sourcesPath));
            if (!arr.isArray()) {
                throw new IllegalArgumentException("sources pack must be a JSON array");
            }
            int created = 0;
            int updated = 0;
            List<String> names = new ArrayList<>();
            for (JsonNode node : arr) {
                String name = node.path("name").asText();
                String type = node.path("type").asText();
                boolean enabled = node.path("defaultEnabled").asBoolean(true);
                JsonNode config = node.path("config");
                if (name.isBlank() || type.isBlank()) {
                    continue;
                }
                SourceEntity entity = sourceRepository.findAll().stream()
                        .filter(s -> name.equals(s.getName()))
                        .findFirst()
                        .orElseGet(SourceEntity::new);
                boolean isNew = entity.getId() == null;
                entity.setName(name);
                entity.setType(SourceType.valueOf(type.toUpperCase()));
                entity.setEnabled(enabled);
                entity.setConfigJson(config.isMissingNode() ? "{}" : objectMapper.writeValueAsString(config));
                sourceRepository.save(entity);
                names.add(name);
                if (isNew) {
                    created++;
                } else {
                    updated++;
                }
            }

            if (profilePath != null && Files.isRegularFile(profilePath)) {
                String profile = Files.readString(profilePath).trim();
                // strip markdown heading lines for interest text
                String interest = profile.lines()
                        .filter(l -> !l.startsWith("#"))
                        .map(String::trim)
                        .filter(l -> !l.isEmpty())
                        .findFirst()
                        .orElse(profile);
                settingsService.update(Map.of("interestProfile", interest));
            }

            Map<String, Object> out = new HashMap<>();
            out.put("sourcesPath", sourcesPath.toString());
            out.put("created", created);
            out.put("updated", updated);
            out.put("names", names);
            out.put("profileImported", profilePath != null);
            return out;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("pack import failed: " + e.getMessage(), e);
        }
    }
}
