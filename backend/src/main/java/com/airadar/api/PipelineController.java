package com.airadar.api;

import com.airadar.domain.NewsItem;
import com.airadar.job.FetchProgress;
import com.airadar.pipeline.PipelineOrchestrator;
import com.airadar.pipeline.PipelineRequest;
import com.airadar.pipeline.PipelineResult;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PipelineController {

    private final PipelineOrchestrator orchestrator;
    private final NewsItemRepository newsItemRepository;
    private final EntityMapper entityMapper;
    private final FetchProgress fetchProgress;

    public PipelineController(
            PipelineOrchestrator orchestrator,
            NewsItemRepository newsItemRepository,
            EntityMapper entityMapper,
            FetchProgress fetchProgress
    ) {
        this.orchestrator = orchestrator;
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
        this.fetchProgress = fetchProgress;
    }

    @PostMapping("/pipeline/run")
    public ResponseEntity<Map<String, Object>> run(@RequestBody(required = false) PipelineRunRequest body) {
        PipelineRequest request = new PipelineRequest(
                body == null ? null : body.lookbackHours(),
                body == null ? null : body.maxItems(),
                body == null ? null : body.scoreThreshold()
        );
        try {
            PipelineResult result = orchestrator.run(request);
            Map<String, Object> response = new HashMap<>();
            response.put("fetched", result.fetched());
            response.put("deduped", result.deduped());
            response.put("scored", result.scored());
            response.put("kept", result.kept());
            response.put("briefPath", result.briefPath());
            response.put("durationMs", result.durationMs());
            response.put("topItems", result.topItems().stream().map(this::toDto).toList());
            Map<String, Object> progressResult = new LinkedHashMap<>();
            progressResult.put("fetched", result.fetched());
            progressResult.put("deduped", result.deduped());
            progressResult.put("scored", result.scored());
            progressResult.put("kept", result.kept());
            progressResult.put("briefPath", result.briefPath());
            progressResult.put("durationMs", result.durationMs());
            fetchProgress.complete(progressResult);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            fetchProgress.fail(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            throw e;
        }
    }

    @GetMapping("/news")
    public List<Map<String, Object>> news(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        LocalDate day = date != null ? date : LocalDate.now(ZoneOffset.UTC);
        Instant since = day.atStartOfDay().toInstant(ZoneOffset.UTC);
        List<NewsItemEntity> entities = newsItemRepository.findByCreatedAtGreaterThanEqualOrderByScoreDesc(since);
        return entities.stream()
                .map(entityMapper::toDomain)
                .map(this::toDto)
                .toList();
    }

    private Map<String, Object> toDto(NewsItem item) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", item.getId());
        dto.put("title", item.getTitle());
        dto.put("canonicalUrl", item.getCanonicalUrl());
        dto.put("score", item.getScore());
        dto.put("summary", item.getSummary());
        dto.put("tags", item.getTags());
        dto.put("category", item.getCategory());
        dto.put("status", item.getStatus());
        dto.put("publishedAt", item.getPublishedAt() == null ? null : item.getPublishedAt().toString());
        dto.put("sourceRefs", item.getSourceRefs());
        return dto;
    }

    public record PipelineRunRequest(Integer lookbackHours, Integer maxItems, Integer scoreThreshold) {
    }
}
