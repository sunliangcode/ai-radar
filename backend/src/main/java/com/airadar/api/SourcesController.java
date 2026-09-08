package com.airadar.api;

import com.airadar.domain.SourceType;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.persistence.SourceEntity;
import com.airadar.persistence.SourceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/sources")
public class SourcesController {

    private final SourceRepository sourceRepository;
    private final NewsItemRepository newsItemRepository;
    private final EntityMapper entityMapper;
    private final ObjectMapper objectMapper;

    public SourcesController(
            SourceRepository sourceRepository,
            NewsItemRepository newsItemRepository,
            EntityMapper entityMapper,
            ObjectMapper objectMapper
    ) {
        this.sourceRepository = sourceRepository;
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return sourceRepository.findAll().stream().map(this::toDto).toList();
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable Long id) {
        SourceEntity entity = sourceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("source not found: " + id));
        Map<String, Object> dto = toDto(entity);
        String prefix = entity.getType().name().toLowerCase() + ":";
        List<Map<String, Object>> sample = newsItemRepository.findTop20ByOrderByCreatedAtDesc().stream()
                .filter(i -> {
                    String refs = i.getSourceRefs();
                    String primary = i.getPrimarySourceId();
                    return (refs != null && refs.contains(entity.getName()))
                            || (primary != null && primary.contains(String.valueOf(entity.getId())))
                            || (i.getPrimarySourceType() == entity.getType());
                })
                .limit(10)
                .map(i -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", i.getId());
                    m.put("title", i.getTitle());
                    m.put("score", i.getScore());
                    m.put("canonicalUrl", i.getCanonicalUrl());
                    m.put("summary", i.getSummary());
                    m.put("publishedAt", ApiTimes.iso(i.getPublishedAt()));
                    return m;
                })
                .toList();
        dto.put("sampleItems", sample);
        dto.put("refHint", prefix);
        return dto;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        SourceEntity entity = new SourceEntity();
        apply(entity, body, true);
        SourceEntity saved = sourceRepository.save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(saved));
    }

    @PatchMapping("/{id}")
    public Map<String, Object> patch(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        SourceEntity entity = sourceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("source not found: " + id));
        apply(entity, body, false);
        return toDto(sourceRepository.save(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!sourceRepository.existsById(id)) {
            throw new NoSuchElementException("source not found: " + id);
        }
        sourceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void apply(SourceEntity entity, Map<String, Object> body, boolean creating) {
        if (creating || body.containsKey("name")) {
            String name = asString(body.get("name"));
            if (name == null || name.isBlank()) {
                throw new IllegalArgumentException("name is required");
            }
            entity.setName(name);
        }
        if (creating || body.containsKey("type")) {
            String type = asString(body.get("type"));
            if (type == null || type.isBlank()) {
                throw new IllegalArgumentException("type is required");
            }
            try {
                entity.setType(SourceType.valueOf(type.toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("unknown source type: " + type);
            }
        }
        if (body.containsKey("enabled")) {
            entity.setEnabled(Boolean.parseBoolean(String.valueOf(body.get("enabled"))));
        } else if (creating) {
            entity.setEnabled(true);
        }
        if (body.containsKey("config") || creating) {
            Object config = body.get("config");
            if (config == null) {
                entity.setConfigJson("{}");
            } else if (config instanceof String s) {
                entity.setConfigJson(s.isBlank() ? "{}" : s);
            } else {
                entity.setConfigJson(entityMapper.writeJson(config));
            }
        }
    }

    private Map<String, Object> toDto(SourceEntity entity) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", entity.getId());
        dto.put("name", entity.getName());
        dto.put("type", entity.getType());
        dto.put("enabled", entity.isEnabled());
        dto.put("lastFetchedAt", ApiTimes.iso(entity.getLastFetchedAt()));
        dto.put("createdAt", ApiTimes.iso(entity.getCreatedAt()));
        dto.put("updatedAt", ApiTimes.iso(entity.getUpdatedAt()));
        try {
            dto.put("config", objectMapper.readValue(
                    entity.getConfigJson() == null ? "{}" : entity.getConfigJson(),
                    Map.class
            ));
        } catch (Exception e) {
            dto.put("config", Map.of());
        }
        return dto;
    }

    private static String asString(Object v) {
        return v == null ? null : String.valueOf(v);
    }
}
