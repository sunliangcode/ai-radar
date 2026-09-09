package com.airadar.api;

import com.airadar.action.ActionService;
import com.airadar.experiment.ExperimentService;
import com.airadar.memory.MemoryService;
import com.airadar.opportunity.OpportunityService;
import com.airadar.outcome.OutcomeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DecisionController {

    private final OpportunityService opportunityService;
    private final ActionService actionService;
    private final ExperimentService experimentService;
    private final OutcomeService outcomeService;
    private final MemoryService memoryService;

    public DecisionController(
            OpportunityService opportunityService,
            ActionService actionService,
            ExperimentService experimentService,
            OutcomeService outcomeService,
            MemoryService memoryService
    ) {
        this.opportunityService = opportunityService;
        this.actionService = actionService;
        this.experimentService = experimentService;
        this.outcomeService = outcomeService;
        this.memoryService = memoryService;
    }

    @GetMapping("/opportunities")
    public ResponseEntity<List<Map<String, Object>>> opportunities() {
        return ResponseEntity.ok(opportunityService.listAll());
    }

    @GetMapping("/actions")
    public ResponseEntity<List<Map<String, Object>>> actions() {
        return ResponseEntity.ok(actionService.listAll());
    }

    @PatchMapping("/actions/{id}")
    public ResponseEntity<Map<String, Object>> patchAction(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(actionService.patch(id, body));
    }

    @GetMapping("/experiments")
    public ResponseEntity<List<Map<String, Object>>> experiments() {
        return ResponseEntity.ok(experimentService.listAll());
    }

    @PutMapping("/experiments/{id}")
    public ResponseEntity<Map<String, Object>> updateExperiment(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(experimentService.updateResults(id, body));
    }

    @GetMapping("/outcomes/summary")
    public ResponseEntity<Map<String, Object>> outcomeSummary() {
        return ResponseEntity.ok(outcomeService.summary());
    }

    @GetMapping("/memory")
    public ResponseEntity<List<Map<String, Object>>> memory() {
        return ResponseEntity.ok(memoryService.listRecent());
    }
}
