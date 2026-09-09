package com.airadar.outcome;

import com.airadar.action.ActionRepository;
import com.airadar.api.ApiTimes;
import com.airadar.experiment.ExperimentEntity;
import com.airadar.experiment.ExperimentRepository;
import com.airadar.impact.ImpactRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class OutcomeService {

    private final OutcomeRepository outcomeRepository;
    private final ExperimentRepository experimentRepository;
    private final ActionRepository actionRepository;
    private final ImpactRepository impactRepository;

    public OutcomeService(
            OutcomeRepository outcomeRepository,
            ExperimentRepository experimentRepository,
            ActionRepository actionRepository,
            ImpactRepository impactRepository
    ) {
        this.outcomeRepository = outcomeRepository;
        this.experimentRepository = experimentRepository;
        this.actionRepository = actionRepository;
        this.impactRepository = impactRepository;
    }

    @Transactional
    public void recordExperiment(ExperimentEntity experiment) {
        String monthKey = YearMonth.now(ZoneId.of("Asia/Shanghai")).toString();
        OutcomeEntity row = outcomeRepository.findByMonthKey(monthKey).orElseGet(() -> {
            OutcomeEntity o = new OutcomeEntity();
            o.setMonthKey(monthKey);
            return o;
        });
        row.setExperimentId(experiment.getId());
        row.setExperimentsCount(row.getExperimentsCount() + 1);
        boolean success = experiment.getSuccessRate() != null && experiment.getSuccessRate() >= 70;
        if (success) {
            row.setSuccessfulCount(row.getSuccessfulCount() + 1);
            double hours = experiment.getReviewTimeMin() == null ? 2.0 : Math.max(0.5, experiment.getReviewTimeMin() / 60.0 * 4);
            row.setTimeSavedHours(row.getTimeSavedHours() + hours);
        }
        if (experiment.getTokenCost() != null) {
            row.setAiCost(row.getAiCost() + experiment.getTokenCost());
        }
        row.setInsightsCount((int) impactRepository.count());
        row.setActionsCount((int) actionRepository.count());
        if (row.getAiCost() > 0) {
            // rough dollar value of saved hours at $50/h
            row.setRoi(row.getTimeSavedHours() * 50.0 / row.getAiCost());
        } else if (row.getTimeSavedHours() > 0) {
            row.setRoi(row.getTimeSavedHours() * 50.0);
        }
        outcomeRepository.save(row);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> summary() {
        String monthKey = YearMonth.now(ZoneId.of("Asia/Shanghai")).toString();
        OutcomeEntity row = outcomeRepository.findByMonthKey(monthKey).orElse(null);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("monthKey", monthKey);
        if (row == null) {
            m.put("insights", impactRepository.count());
            m.put("actions", actionRepository.count());
            m.put("experiments", experimentRepository.count());
            m.put("successful", 0);
            m.put("timeSavedHours", 0);
            m.put("aiCost", 0);
            m.put("roi", null);
            return m;
        }
        m.put("insights", row.getInsightsCount());
        m.put("actions", row.getActionsCount());
        m.put("experiments", row.getExperimentsCount());
        m.put("successful", row.getSuccessfulCount());
        m.put("timeSavedHours", row.getTimeSavedHours());
        m.put("aiCost", row.getAiCost());
        m.put("roi", row.getRoi());
        m.put("updatedAt", ApiTimes.iso(row.getUpdatedAt()));
        return m;
    }
}
