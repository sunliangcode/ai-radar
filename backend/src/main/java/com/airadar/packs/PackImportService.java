package com.airadar.packs;

import com.airadar.domain.SourceType;
import com.airadar.persistence.SourceEntity;
import com.airadar.persistence.SourceRepository;
import com.airadar.settings.SettingsService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
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
        String id = packId == null || packId.isBlank() ? "ai-core" : packId;
        PackSources sources = resolveSources(id, path);
        String profileText = resolveProfile(id, path == null || path.isBlank());

        try {
            JsonNode arr = objectMapper.readTree(sources.json());
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

            boolean profileImported = false;
            if (profileText != null && !profileText.isBlank()) {
                String interest = profileText.lines()
                        .filter(l -> !l.startsWith("#"))
                        .map(String::trim)
                        .filter(l -> !l.isEmpty())
                        .findFirst()
                        .orElse(profileText);
                settingsService.update(Map.of("interestProfile", interest));
                profileImported = true;
            }

            Map<String, Object> out = new HashMap<>();
            out.put("sourcesPath", sources.label());
            out.put("created", created);
            out.put("updated", updated);
            out.put("names", names);
            out.put("profileImported", profileImported);
            return out;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("pack import failed: " + e.getMessage(), e);
        }
    }

    private PackSources resolveSources(String id, String path) {
        if (path != null && !path.isBlank()) {
            Path sourcesPath = Path.of(path);
            if (!Files.isRegularFile(sourcesPath)) {
                throw new IllegalArgumentException("pack sources not found: " + sourcesPath.toAbsolutePath());
            }
            try {
                return new PackSources(Files.readString(sourcesPath), sourcesPath.toString());
            } catch (IOException e) {
                throw new IllegalStateException("failed to read pack: " + e.getMessage(), e);
            }
        }

        Path root = Path.of("packs");
        if (!Files.isDirectory(root) && Files.isDirectory(Path.of("../packs"))) {
            root = Path.of("../packs");
        }
        Path fsPath = root.resolve("sources").resolve(id + ".json");
        if (Files.isRegularFile(fsPath)) {
            try {
                return new PackSources(Files.readString(fsPath), fsPath.toString());
            } catch (IOException e) {
                throw new IllegalStateException("failed to read pack: " + e.getMessage(), e);
            }
        }

        ClassPathResource classpath = new ClassPathResource("packs/sources/" + id + ".json");
        if (classpath.exists()) {
            try (InputStream in = classpath.getInputStream()) {
                String json = new String(in.readAllBytes(), StandardCharsets.UTF_8);
                return new PackSources(json, "classpath:packs/sources/" + id + ".json");
            } catch (IOException e) {
                throw new IllegalStateException("failed to read classpath pack: " + e.getMessage(), e);
            }
        }

        throw new IllegalArgumentException("pack sources not found: " + id
                + " (tried " + fsPath.toAbsolutePath() + " and classpath)");
    }

    private String resolveProfile(String id, boolean allowDefaultLookup) {
        if (!allowDefaultLookup) {
            return null;
        }
        Path root = Path.of("packs");
        if (!Files.isDirectory(root) && Files.isDirectory(Path.of("../packs"))) {
            root = Path.of("../packs");
        }
        Path profileCandidate = root.resolve("profiles").resolve(
                "ai-core".equals(id) ? "builder.md" : id + ".md");
        if (Files.isRegularFile(profileCandidate)) {
            try {
                return Files.readString(profileCandidate).trim();
            } catch (IOException ignored) {
                // fall through
            }
        } else if (Files.isRegularFile(root.resolve("profiles/builder.md")) && "ai-core".equals(id)) {
            try {
                return Files.readString(root.resolve("profiles/builder.md")).trim();
            } catch (IOException ignored) {
                // fall through
            }
        }

        String classpathName = "ai-core".equals(id) ? "packs/profiles/builder.md" : "packs/profiles/" + id + ".md";
        ClassPathResource classpath = new ClassPathResource(classpathName);
        if (classpath.exists()) {
            try (InputStream in = classpath.getInputStream()) {
                return new String(in.readAllBytes(), StandardCharsets.UTF_8).trim();
            } catch (IOException ignored) {
                return null;
            }
        }
        return null;
    }

    private record PackSources(String json, String label) {
    }
}
