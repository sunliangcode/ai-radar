package com.airadar.api;

import com.airadar.decision.DecisionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
}
