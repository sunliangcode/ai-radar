package com.airadar.api;

import com.airadar.job.RadarJobs;
import com.airadar.pipeline.PipelineResult;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
public class JobsController {

    private final RadarJobs radarJobs;

    public JobsController(RadarJobs radarJobs) {
        this.radarJobs = radarJobs;
    }

    @PostMapping("/fetch")
    public ResponseEntity<Map<String, Object>> fetch() {
        PipelineResult result = radarJobs.runFetch();
        Map<String, Object> response = new HashMap<>();
        response.put("fetched", result.fetched());
        response.put("deduped", result.deduped());
        response.put("scored", result.scored());
        response.put("kept", result.kept());
        response.put("briefPath", result.briefPath());
        response.put("durationMs", result.durationMs());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/push")
    public ResponseEntity<Map<String, Object>> push() {
        return ResponseEntity.ok(radarJobs.runPush());
    }

    @PostMapping("/cluster")
    public ResponseEntity<Map<String, Object>> cluster() {
        return ResponseEntity.ok(radarJobs.runCluster());
    }
}
