package com.airadar.api;

import com.airadar.job.JobScheduleCoordinator;
import com.airadar.job.RadarJobs;
import com.airadar.maintenance.DuplicateTitleCleanupService;
import com.airadar.maintenance.RetentionService;
import com.airadar.pipeline.PipelineResult;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
public class JobsController {

    private final RadarJobs radarJobs;
    private final JobScheduleCoordinator scheduleCoordinator;
    private final RetentionService retentionService;
    private final DuplicateTitleCleanupService duplicateTitleCleanupService;

    public JobsController(
            RadarJobs radarJobs,
            JobScheduleCoordinator scheduleCoordinator,
            RetentionService retentionService,
            DuplicateTitleCleanupService duplicateTitleCleanupService
    ) {
        this.radarJobs = radarJobs;
        this.scheduleCoordinator = scheduleCoordinator;
        this.retentionService = retentionService;
        this.duplicateTitleCleanupService = duplicateTitleCleanupService;
    }

    @GetMapping("/schedule")
    public ResponseEntity<Map<String, Object>> schedule() {
        return ResponseEntity.ok(scheduleCoordinator.snapshot());
    }

    @PostMapping("/fetch")
    public ResponseEntity<Map<String, Object>> fetch(
            @RequestParam(required = false) String sourceType
    ) {
        PipelineResult result = radarJobs.runFetch(sourceType);
        Map<String, Object> response = new HashMap<>();
        response.put("fetched", result.fetched());
        response.put("deduped", result.deduped());
        response.put("scored", result.scored());
        response.put("kept", result.kept());
        response.put("briefPath", result.briefPath());
        response.put("durationMs", result.durationMs());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/fetch/progress")
    public ResponseEntity<Map<String, Object>> fetchProgress() {
        return ResponseEntity.ok(radarJobs.fetchProgressSnapshot());
    }

    @PostMapping("/push")
    public ResponseEntity<Map<String, Object>> push() {
        return ResponseEntity.ok(radarJobs.runPush());
    }

    @PostMapping("/cluster")
    public ResponseEntity<Map<String, Object>> cluster() {
        return ResponseEntity.ok(radarJobs.runCluster());
    }

    @PostMapping("/impact")
    public ResponseEntity<Map<String, Object>> impact() {
        return ResponseEntity.ok(radarJobs.runImpact());
    }

    @PostMapping("/cleanup")
    public ResponseEntity<Map<String, Object>> cleanup() {
        return ResponseEntity.ok(retentionService.run());
    }

    @PostMapping("/cleanup-duplicate-titles")
    public ResponseEntity<Map<String, Object>> cleanupDuplicateTitles() {
        return ResponseEntity.ok(duplicateTitleCleanupService.run());
    }
}
