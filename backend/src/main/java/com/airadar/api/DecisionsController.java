package com.airadar.api;

import com.airadar.decision.DecisionService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DecisionsController {

    private final DecisionService decisionService;

    public DecisionsController(DecisionService decisionService) {
        this.decisionService = decisionService;
    }

    @GetMapping("/decisions")
    public List<Map<String, Object>> list(@RequestParam(required = false) String revisit) {
        if ("due".equalsIgnoreCase(revisit)) {
            return decisionService.listDueRevisit();
        }
        return decisionService.listAll();
    }

    /** `{ due }` count for nav badges (open decisions whose revisit is due). */
    @GetMapping("/decisions/badge")
    public Map<String, Object> badge() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("due", decisionService.listDueRevisit().size());
        return out;
    }

    /** Snooze revisit (default +7d), or body `{ revisitAt }` to restore absolute time (Undo). */
    @PostMapping("/decisions/{id}/snooze")
    public Map<String, Object> snooze(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        int days = 7;
        String revisitAt = null;
        if (body != null) {
            if (body.get("revisitAt") != null) {
                revisitAt = String.valueOf(body.get("revisitAt"));
            }
            if (body.get("days") != null) {
                try {
                    days = Integer.parseInt(String.valueOf(body.get("days")));
                } catch (NumberFormatException ignored) {
                    days = 7;
                }
            }
        }
        return decisionService.snooze(id, days, revisitAt);
    }

    /** Withdraw an open decision (Undo after save). Watch-kind also Unfollows. */
    @DeleteMapping("/decisions/{id}")
    public Map<String, Object> withdraw(@PathVariable Long id) {
        return decisionService.withdraw(id);
    }
}
