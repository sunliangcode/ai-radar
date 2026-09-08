package com.airadar.api;

import com.airadar.config.RadarProperties;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.settings.SettingsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/briefs")
public class BriefsController {

    private final RadarProperties properties;
    private final SettingsService settingsService;
    private final NewsItemRepository newsItemRepository;
    private final EntityMapper entityMapper;

    public BriefsController(
            RadarProperties properties,
            SettingsService settingsService,
            NewsItemRepository newsItemRepository,
            EntityMapper entityMapper
    ) {
        this.properties = properties;
        this.settingsService = settingsService;
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
    }

    @GetMapping
    public List<Map<String, Object>> list() throws IOException {
        Path dir = Path.of(properties.getBriefsDir());
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        List<Map<String, Object>> out = new ArrayList<>();
        try (Stream<Path> stream = Files.list(dir)) {
            stream.filter(p -> p.getFileName().toString().endsWith(".md"))
                    .sorted(Comparator.comparing(Path::getFileName).reversed())
                    .forEach(p -> {
                        String name = p.getFileName().toString().replace(".md", "");
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("date", name);
                        try {
                            row.put("size", Files.size(p));
                            row.put("modifiedAt", ApiTimes.iso(Files.getLastModifiedTime(p).toInstant()));
                        } catch (IOException e) {
                            row.put("size", 0);
                        }
                        out.add(row);
                    });
        }
        return out;
    }

    @GetMapping("/{date}")
    public Map<String, Object> get(@PathVariable String date) throws IOException {
        LocalDate day;
        try {
            day = LocalDate.parse(date);
        } catch (Exception e) {
            throw new IllegalArgumentException("invalid date: " + date);
        }
        Path file = Path.of(properties.getBriefsDir()).resolve(day + ".md");
        if (!Files.isRegularFile(file)) {
            throw new NoSuchElementException("brief not found: " + date);
        }
        String markdown = Files.readString(file);
        ZoneId zone = ZoneId.of(settingsService.effective().timezone() != null
                ? settingsService.effective().timezone() : "Asia/Shanghai");
        Instant since = day.atStartOfDay(zone).toInstant();
        Instant until = day.plusDays(1).atStartOfDay(zone).toInstant();
        List<Map<String, Object>> items = newsItemRepository.findByCreatedAtGreaterThanEqualOrderByScoreDesc(since)
                .stream()
                .filter(e -> e.getCreatedAt() != null && e.getCreatedAt().isBefore(until))
                .map(entityMapper::toDomain)
                .map(i -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", i.getId());
                    m.put("title", i.getTitle());
                    m.put("score", i.getScore());
                    m.put("summary", i.getSummary());
                    m.put("canonicalUrl", i.getCanonicalUrl());
                    return m;
                })
                .toList();

        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("date", day.toString());
        dto.put("markdown", markdown);
        dto.put("items", items);
        return dto;
    }
}
