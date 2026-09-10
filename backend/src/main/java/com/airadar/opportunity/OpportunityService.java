package com.airadar.opportunity;

import com.airadar.action.ActionEntity;
import com.airadar.action.ActionRepository;
import com.airadar.api.ApiTimes;
import com.airadar.context.ContextService;
import com.airadar.impact.ImpactEntity;
import com.airadar.provider.ai.AiService;
import com.airadar.provider.ai.OpportunitySuggestion;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class OpportunityService {

    private final OpportunityRepository opportunityRepository;
    private final ActionRepository actionRepository;
    private final AiService aiService;
    private final ContextService contextService;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;

    public OpportunityService(
            OpportunityRepository opportunityRepository,
            ActionRepository actionRepository,
            AiService aiService,
            ContextService contextService,
            ObjectMapper objectMapper,
            TransactionTemplate transactionTemplate
    ) {
        this.opportunityRepository = opportunityRepository;
        this.actionRepository = actionRepository;
        this.aiService = aiService;
        this.contextService = contextService;
        this.objectMapper = objectMapper;
        this.transactionTemplate = transactionTemplate;
    }

    /** LLM outside TX; persist opportunity + action in a short write. */
    public void ensureForImpact(ImpactEntity impact) {
        if (impact == null || impact.getId() == null) {
            return;
        }
        if (opportunityRepository.findFirstByImpactId(impact.getId()).isPresent()) {
            return;
        }
        Long impactId = impact.getId();
        Long eventId = impact.getEventId();
        String title = impact.getTitle();
        String why = impact.getWhyText();
        String recommendation = impact.getRecommendation();
        String contextJson = contextService.payloadJson();

        OpportunitySuggestion suggestion = aiService.suggestOpportunity(
                contextJson,
                title,
                why,
                recommendation
        );

        transactionTemplate.executeWithoutResult(status -> {
            if (opportunityRepository.findFirstByImpactId(impactId).isPresent()) {
                return;
            }
            OpportunityEntity opp = new OpportunityEntity();
            opp.setImpactId(impactId);
            opp.setEventId(eventId);
            opp.setTitle(suggestion.title());
            opp.setSummary(suggestion.summary());
            opp.setEstimatedHours(suggestion.estimatedHoursPerMonth());
            opp.setCoveragePct(suggestion.coveragePct());
            opp.setKind(suggestion.kind());
            opportunityRepository.save(opp);

            if (actionRepository.findFirstByImpactId(impactId).isEmpty()) {
                ActionEntity action = new ActionEntity();
                action.setOpportunityId(opp.getId());
                action.setImpactId(impactId);
                action.setEventId(eventId);
                action.setTitle(suggestion.actionTitle());
                try {
                    action.setStepsJson(objectMapper.writeValueAsString(suggestion.steps()));
                } catch (Exception e) {
                    action.setStepsJson("[]");
                }
                action.setEstimatedMinutes(suggestion.estimatedMinutes());
                action.setSuccessCriteria(suggestion.successCriteria());
                action.setStatus("open");
                actionRepository.save(action);
            }
        });
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAll() {
        return opportunityRepository.findAllByOrderByUpdatedAtDesc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listByKind(String kind) {
        return opportunityRepository.findByKindOrderByUpdatedAtDesc(kind).stream().map(this::toDto).toList();
    }

    public Map<String, Object> toDto(OpportunityEntity e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("impactId", e.getImpactId());
        m.put("eventId", e.getEventId());
        m.put("title", e.getTitle());
        m.put("summary", e.getSummary());
        m.put("estimatedHours", e.getEstimatedHours());
        m.put("coveragePct", e.getCoveragePct());
        m.put("kind", e.getKind());
        m.put("updatedAt", ApiTimes.iso(e.getUpdatedAt()));
        return m;
    }
}
