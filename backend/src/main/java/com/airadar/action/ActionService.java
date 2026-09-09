package com.airadar.action;

import com.airadar.api.ApiTimes;
import com.airadar.experiment.ExperimentService;
import com.airadar.memory.MemoryService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class ActionService {

    private final ActionRepository actionRepository;
    private final ObjectMapper objectMapper;
    private final ExperimentService experimentService;
    private final MemoryService memoryService;

    public ActionService(
            ActionRepository actionRepository,
            ObjectMapper objectMapper,
            @Lazy ExperimentService experimentService,
            MemoryService memoryService
    ) {
        this.actionRepository = actionRepository;
        this.objectMapper = objectMapper;
        this.experimentService = experimentService;
        this.memoryService = memoryService;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listOpen() {
        return actionRepository.findByStatusInOrderByUpdatedAtDesc(List.of("open", "started", "watching"))
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAll() {
        return actionRepository.findAllByOrderByUpdatedAtDesc().stream().map(this::toDto).toList();
    }

    @Transactional
    public Map<String, Object> patch(Long id, Map<String, Object> body) {
        ActionEntity action = actionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("action not found"));
        String status = body.get("status") == null ? null : body.get("status").toString();
        if (status != null) {
            if (!List.of("open", "started", "ignored", "watching").contains(status)) {
                throw new IllegalArgumentException("invalid status");
            }
            action.setStatus(status);
            if ("started".equals(status)) {
                experimentService.startFromAction(action);
            }
            if ("ignored".equals(status)) {
                memoryService.remember("rejected", "action", action.getId(), action.getTitle(), null);
            }
            if ("watching".equals(status)) {
                memoryService.remember("watch", "action", action.getId(), action.getTitle(), null);
            }
        }
        actionRepository.save(action);
        return toDto(action);
    }

    public Map<String, Object> toDto(ActionEntity e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("opportunityId", e.getOpportunityId());
        m.put("impactId", e.getImpactId());
        m.put("eventId", e.getEventId());
        m.put("title", e.getTitle());
        try {
            m.put("steps", objectMapper.readValue(
                    e.getStepsJson() == null ? "[]" : e.getStepsJson(),
                    new TypeReference<List<String>>() {
                    }));
        } catch (Exception ex) {
            m.put("steps", List.of());
        }
        m.put("estimatedMinutes", e.getEstimatedMinutes());
        m.put("successCriteria", e.getSuccessCriteria());
        m.put("status", e.getStatus());
        m.put("updatedAt", ApiTimes.iso(e.getUpdatedAt()));
        return m;
    }
}
