package com.airadar.experiment;

import com.airadar.action.ActionEntity;
import com.airadar.api.ApiTimes;
import com.airadar.memory.MemoryService;
import com.airadar.outcome.OutcomeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class ExperimentService {

    private final ExperimentRepository experimentRepository;
    private final OutcomeService outcomeService;
    private final MemoryService memoryService;

    public ExperimentService(
            ExperimentRepository experimentRepository,
            OutcomeService outcomeService,
            MemoryService memoryService
    ) {
        this.experimentRepository = experimentRepository;
        this.outcomeService = outcomeService;
        this.memoryService = memoryService;
    }

    @Transactional
    public ExperimentEntity startFromAction(ActionEntity action) {
        return experimentRepository.findFirstByActionIdAndStatus(action.getId(), "running")
                .orElseGet(() -> {
                    ExperimentEntity e = new ExperimentEntity();
                    e.setActionId(action.getId());
                    e.setTitle(action.getTitle());
                    e.setGoal(action.getSuccessCriteria());
                    e.setStatus("running");
                    return experimentRepository.save(e);
                });
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAll() {
        return experimentRepository.findAllByOrderByUpdatedAtDesc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listActive() {
        return experimentRepository.findByStatusOrderByUpdatedAtDesc("running").stream().map(this::toDto).toList();
    }

    @Transactional
    public Map<String, Object> updateResults(Long id, Map<String, Object> body) {
        ExperimentEntity e = experimentRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("experiment not found"));
        if (body.containsKey("successRate")) {
            e.setSuccessRate(asDouble(body.get("successRate")));
        }
        if (body.containsKey("latencyMs")) {
            e.setLatencyMs(asDouble(body.get("latencyMs")));
        }
        if (body.containsKey("tokenCost")) {
            e.setTokenCost(asDouble(body.get("tokenCost")));
        }
        if (body.containsKey("humanIntervention")) {
            e.setHumanIntervention(asDouble(body.get("humanIntervention")));
        }
        if (body.containsKey("reviewTimeMin")) {
            e.setReviewTimeMin(asDouble(body.get("reviewTimeMin")));
        }
        if (body.containsKey("notes")) {
            e.setNotes(body.get("notes") == null ? null : body.get("notes").toString());
        }
        boolean complete = body.containsKey("status") && "completed".equals(String.valueOf(body.get("status")));
        if (complete || (e.getSuccessRate() != null && !"completed".equals(e.getStatus()))) {
            e.setStatus("completed");
            e.setCompletedAt(Instant.now());
            outcomeService.recordExperiment(e);
            boolean success = e.getSuccessRate() != null && e.getSuccessRate() >= 70;
            memoryService.remember(
                    success ? "effective" : "ineffective",
                    "experiment",
                    e.getId(),
                    e.getTitle(),
                    null
            );
        }
        experimentRepository.save(e);
        return toDto(e);
    }

    public Map<String, Object> toDto(ExperimentEntity e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("actionId", e.getActionId());
        m.put("title", e.getTitle());
        m.put("goal", e.getGoal());
        m.put("status", e.getStatus());
        m.put("successRate", e.getSuccessRate());
        m.put("latencyMs", e.getLatencyMs());
        m.put("tokenCost", e.getTokenCost());
        m.put("humanIntervention", e.getHumanIntervention());
        m.put("reviewTimeMin", e.getReviewTimeMin());
        m.put("notes", e.getNotes());
        m.put("createdAt", ApiTimes.iso(e.getCreatedAt()));
        m.put("completedAt", ApiTimes.iso(e.getCompletedAt()));
        return m;
    }

    private static Double asDouble(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof Number n) {
            return n.doubleValue();
        }
        return Double.parseDouble(v.toString());
    }
}
