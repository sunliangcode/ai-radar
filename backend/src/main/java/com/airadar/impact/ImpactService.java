package com.airadar.impact;

import com.airadar.api.ApiTimes;
import com.airadar.context.ContextService;
import com.airadar.event.EventEntity;
import com.airadar.event.EventRepository;
import com.airadar.memory.MemoryService;
import com.airadar.opportunity.OpportunityService;
import com.airadar.provider.ai.AiService;
import com.airadar.provider.ai.ImpactAnalysisResult;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ImpactService {

    private final ImpactRepository impactRepository;
    private final EventRepository eventRepository;
    private final ContextService contextService;
    private final AiService aiService;
    private final MemoryService memoryService;
    private final OpportunityService opportunityService;
    private final TransactionTemplate transactionTemplate;

    public ImpactService(
            ImpactRepository impactRepository,
            EventRepository eventRepository,
            ContextService contextService,
            AiService aiService,
            MemoryService memoryService,
            @Lazy OpportunityService opportunityService,
            TransactionTemplate transactionTemplate
    ) {
        this.impactRepository = impactRepository;
        this.eventRepository = eventRepository;
        this.contextService = contextService;
        this.aiService = aiService;
        this.memoryService = memoryService;
        this.opportunityService = opportunityService;
        this.transactionTemplate = transactionTemplate;
    }

    /** LLM stays outside TX; each event persists in a short write boundary. */
    public Map<String, Object> recomputeAll() {
        contextService.getOrSeed();
        String contextJson = contextService.payloadJson();
        String memory = memoryService.recentHints();
        List<EventEntity> events = eventRepository.findTop50ByOrderByScoreDesc();
        int computed = 0;
        int high = 0;
        for (EventEntity event : events) {
            ImpactEntity impact = analyzeAndPersist(event, contextJson, memory);
            computed++;
            if (impact != null && "HIGH".equalsIgnoreCase(impact.getTier())) {
                high++;
                opportunityService.ensureForImpact(impact);
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("computed", computed);
        result.put("high", high);
        return result;
    }

    /** Recompute impact copy/scores for one change (event). */
    public Map<String, Object> recomputeOne(long eventId) {
        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "change not found"));
        contextService.getOrSeed();
        ImpactEntity impact = analyzeAndPersist(event, contextService.payloadJson(), memoryService.recentHints());
        if (impact == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "impact persist failed");
        }
        if ("HIGH".equalsIgnoreCase(impact.getTier())) {
            opportunityService.ensureForImpact(impact);
        }
        return toDto(impact);
    }

    private ImpactEntity analyzeAndPersist(EventEntity event, String contextJson, String memory) {
        Long eventId = event.getId();
        String title = event.getTitle();
        ImpactAnalysisResult analysis = aiService.analyzeImpact(
                contextJson,
                title,
                event.getSummary(),
                event.getImpact(),
                memory
        );
        return transactionTemplate.execute(status -> persistAnalysis(eventId, title, analysis));
    }

    private ImpactEntity persistAnalysis(Long eventId, String title, ImpactAnalysisResult analysis) {
        double effort = Math.max(1, analysis.effort());
        double priority = analysis.relevance() * analysis.impact() * analysis.urgency() * analysis.confidence() / effort;

        ImpactEntity row = impactRepository.findByEventId(eventId).orElseGet(ImpactEntity::new);
        row.setEventId(eventId);
        row.setTitle(title);
        row.setRelevance(analysis.relevance());
        row.setImpactScore(analysis.impact());
        row.setUrgency(analysis.urgency());
        row.setConfidence(analysis.confidence());
        row.setEffort(analysis.effort());
        row.setPriority(priority);
        row.setTier(analysis.tier());
        row.setWhyText(analysis.why());
        row.setEvidenceText(analysis.evidence());
        row.setRecommendation(analysis.recommendation());
        return impactRepository.save(row);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listByTiers(List<String> tiers) {
        return impactRepository.findByTierInOrderByPriorityDesc(tiers).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> whyCare() {
        return impactRepository.findByTierNotOrderByPriorityDesc("IGNORE").stream()
                .limit(12)
                .map(this::toDto)
                .toList();
    }

    public Map<String, Object> toDto(ImpactEntity e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("eventId", e.getEventId());
        m.put("title", e.getTitle());
        m.put("relevance", e.getRelevance());
        m.put("impact", e.getImpactScore());
        m.put("urgency", e.getUrgency());
        m.put("confidence", e.getConfidence());
        m.put("effort", e.getEffort());
        m.put("priority", e.getPriority());
        m.put("tier", e.getTier());
        m.put("why", e.getWhyText());
        m.put("evidence", e.getEvidenceText());
        m.put("recommendation", e.getRecommendation());
        m.put("updatedAt", ApiTimes.iso(e.getUpdatedAt()));
        return m;
    }
}
