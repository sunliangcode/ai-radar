package com.airadar.api;

import com.airadar.change.ChangeInteractionService;
import com.airadar.change.ChangeService;
import com.airadar.decision.DecisionService;
import com.airadar.impact.ImpactService;
import com.airadar.watch.WatchSubscriptionService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ChangesController {

    private final ChangeService changeService;
    private final ChangeInteractionService changeInteractionService;
    private final DecisionService decisionService;
    private final WatchSubscriptionService watchSubscriptionService;
    private final ImpactService impactService;

    public ChangesController(
            ChangeService changeService,
            ChangeInteractionService changeInteractionService,
            DecisionService decisionService,
            WatchSubscriptionService watchSubscriptionService,
            ImpactService impactService
    ) {
        this.changeService = changeService;
        this.changeInteractionService = changeInteractionService;
        this.decisionService = decisionService;
        this.watchSubscriptionService = watchSubscriptionService;
        this.impactService = impactService;
    }

    @GetMapping("/changes")
    public List<Map<String, Object>> list(
            @RequestParam(defaultValue = "40") int limit,
            @RequestParam(required = false) String tier
    ) {
        return changeService.listRecent(limit, tier);
    }

    @GetMapping("/changes/{id}")
    public Map<String, Object> get(@PathVariable Long id) {
        Map<String, Object> dto = changeService.get(id);
        decisionService.latestOpen(id).ifPresent(d -> dto.put("latestDecision", d));
        dto.put("watched", watchSubscriptionService.isWatched(id));
        return dto;
    }

    @PostMapping("/changes/{id}/dismiss")
    public Map<String, Object> dismiss(@PathVariable Long id) {
        return changeInteractionService.dismiss(id);
    }

    @DeleteMapping("/changes/{id}/dismiss")
    public Map<String, Object> undismiss(@PathVariable Long id) {
        return changeInteractionService.undismiss(id);
    }

    @PostMapping("/changes/{id}/decisions")
    public Map<String, Object> decide(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String kind = body.get("kind") == null ? null : body.get("kind").toString();
        String reason = body.get("reason") == null ? null : body.get("reason").toString();
        String revisitAt = body.get("revisitAt") == null ? null : body.get("revisitAt").toString();
        return decisionService.record(id, kind, reason, revisitAt);
    }

    /** Refresh why / recommendation / scores for one change (uses current Context + summaryLanguage). */
    @PostMapping("/changes/{id}/recompute-impact")
    public Map<String, Object> recomputeImpact(@PathVariable Long id) {
        return impactService.recomputeOne(id);
    }

    @PutMapping("/watch/{changeId}")
    public Map<String, Object> watch(@PathVariable Long changeId, @RequestBody Map<String, Object> body) {
        return watchSubscriptionService.upsertForChange(changeId, body);
    }

    @DeleteMapping("/watch/{changeId}")
    public Map<String, Object> unwatch(@PathVariable Long changeId) {
        return watchSubscriptionService.removeForChange(changeId);
    }
}
