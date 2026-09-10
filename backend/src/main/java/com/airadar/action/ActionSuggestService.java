package com.airadar.action;

import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.provider.ai.AiService;
import com.airadar.provider.ai.ItemActionSuggestion;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.ExecutorService;

@Service
public class ActionSuggestService {

    private static final Logger log = LoggerFactory.getLogger(ActionSuggestService.class);

    private final NewsItemRepository newsItemRepository;
    private final ActionRepository actionRepository;
    private final AiService aiService;
    private final ObjectMapper objectMapper;
    private final ExecutorService fetchExecutor;
    private final TransactionTemplate transactionTemplate;

    public ActionSuggestService(
            NewsItemRepository newsItemRepository,
            ActionRepository actionRepository,
            AiService aiService,
            ObjectMapper objectMapper,
            ExecutorService fetchExecutor,
            TransactionTemplate transactionTemplate
    ) {
        this.newsItemRepository = newsItemRepository;
        this.actionRepository = actionRepository;
        this.aiService = aiService;
        this.objectMapper = objectMapper;
        this.fetchExecutor = fetchExecutor;
        this.transactionTemplate = transactionTemplate;
    }

    public void suggestForItemAsync(Long itemId) {
        if (itemId == null) {
            return;
        }
        fetchExecutor.execute(() -> {
            try {
                suggestForItem(itemId);
            } catch (Exception e) {
                log.warn("action_suggest_failed itemId={} error={}", itemId, e.getMessage());
            }
        });
    }

    /** Load → LLM outside TX → short persist. */
    public void suggestForItem(Long itemId) {
        if (actionRepository.findFirstByNewsItemId(itemId).isPresent()) {
            return;
        }
        NewsItemEntity item = newsItemRepository.findById(itemId).orElse(null);
        if (item == null || !item.isSaved()) {
            return;
        }
        String title = item.getTitleDisplay() != null && !item.getTitleDisplay().isBlank()
                ? item.getTitleDisplay()
                : item.getTitle();
        String url = item.getCanonicalUrl();
        String body = item.getSummary() != null ? item.getSummary() : item.getContentSnippet();
        String fallbackTitle = item.getTitle();

        ItemActionSuggestion suggestion = aiService.suggestItemAction(title, url, body);
        if (suggestion == null || !suggestion.shouldAct()) {
            log.info("action_suggest_skip itemId={} reason=shouldAct_false", itemId);
            return;
        }

        String actionTitle = suggestion.title() == null || suggestion.title().isBlank()
                ? "Follow up: " + fallbackTitle
                : suggestion.title();
        final String stepsJson = serializeSteps(suggestion.steps());
        Integer estimatedMinutes = suggestion.estimatedMinutes();
        String successCriteria = suggestion.successCriteria();

        transactionTemplate.executeWithoutResult(status -> {
            if (actionRepository.findFirstByNewsItemId(itemId).isPresent()) {
                return;
            }
            ActionEntity action = new ActionEntity();
            action.setNewsItemId(itemId);
            action.setTitle(actionTitle);
            action.setStepsJson(stepsJson);
            action.setEstimatedMinutes(estimatedMinutes);
            action.setSuccessCriteria(successCriteria);
            action.setStatus("open");
            actionRepository.save(action);
            log.info("action_suggest_created itemId={} actionId={}", itemId, action.getId());
        });
    }

    private String serializeSteps(java.util.List<String> steps) {
        try {
            return objectMapper.writeValueAsString(steps == null ? java.util.List.of() : steps);
        } catch (Exception e) {
            return "[]";
        }
    }
}
