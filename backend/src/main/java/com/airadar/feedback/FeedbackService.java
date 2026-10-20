package com.airadar.feedback;

import com.airadar.action.ActionEntity;
import com.airadar.action.ActionRepository;
import com.airadar.action.ActionService;
import com.airadar.context.ContextService;
import com.airadar.event.EventEntity;
import com.airadar.event.EventRepository;
import com.airadar.memory.MemoryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class FeedbackService {

    private static final List<String> KINDS = List.of("useful", "irrelevant", "watch", "ignore", "tried");

    private final MemoryService memoryService;
    private final ActionService actionService;
    private final ActionRepository actionRepository;
    private final EventRepository eventRepository;
    private final ContextService contextService;

    public FeedbackService(
            MemoryService memoryService,
            ActionService actionService,
            ActionRepository actionRepository,
            EventRepository eventRepository,
            ContextService contextService
    ) {
        this.memoryService = memoryService;
        this.actionService = actionService;
        this.actionRepository = actionRepository;
        this.eventRepository = eventRepository;
        this.contextService = contextService;
    }

    @Transactional
    public Map<String, Object> submit(String targetType, Long targetId, String kind) {
        if (targetType == null || targetId == null || kind == null) {
            throw new IllegalArgumentException("targetType, targetId and kind are required");
        }
        String type = targetType.trim().toLowerCase();
        String feedbackKind = kind.trim().toLowerCase();
        if (!KINDS.contains(feedbackKind)) {
            throw new IllegalArgumentException("invalid kind: " + kind);
        }
        if (!List.of("change", "action").contains(type)) {
            throw new IllegalArgumentException("invalid targetType: " + targetType);
        }

        if ("action".equals(type)) {
            return feedbackOnAction(targetId, feedbackKind);
        }
        return feedbackOnChange(targetId, feedbackKind);
    }

    private Map<String, Object> feedbackOnAction(Long actionId, String kind) {
        ActionEntity action = actionRepository.findById(actionId)
                .orElseThrow(() -> new NoSuchElementException("action not found: " + actionId));
        String memoryKind = memoryKind(kind);
        memoryService.remember(memoryKind, "action", actionId, action.getTitle(), payload(kind));

        String status = actionStatus(kind);
        Map<String, Object> updated = actionService.patch(actionId, Map.of("status", status));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("targetType", "action");
        out.put("targetId", actionId);
        out.put("kind", kind);
        out.put("action", updated);
        return out;
    }

    private Map<String, Object> feedbackOnChange(Long eventId, String kind) {
        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NoSuchElementException("change not found: " + eventId));
        String memoryKind = memoryKind(kind);
        memoryService.remember(memoryKind, "change", eventId, event.getTitle(), payload(kind));
        if ("irrelevant".equals(kind) || "ignore".equals(kind)) {
            contextService.noteTopicFeedback(event.getTitle(), false);
        } else if ("useful".equals(kind)) {
            contextService.noteTopicFeedback(event.getTitle(), true);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("targetType", "change");
        out.put("targetId", eventId);
        out.put("kind", kind);
        out.put("title", event.getTitle());
        return out;
    }

    /**
     * Undo feedback: drop memory rows; reverse topic-weight nudge for change;
     * optionally restore prior action status when {@code previousActionStatus} is set.
     */
    @Transactional
    public Map<String, Object> withdraw(
            String targetType,
            Long targetId,
            String kind,
            String previousActionStatus
    ) {
        if (targetType == null || targetId == null || kind == null) {
            throw new IllegalArgumentException("targetType, targetId and kind are required");
        }
        String type = targetType.trim().toLowerCase();
        String feedbackKind = kind.trim().toLowerCase();
        if (!KINDS.contains(feedbackKind)) {
            throw new IllegalArgumentException("invalid kind: " + kind);
        }
        if (!List.of("change", "action").contains(type)) {
            throw new IllegalArgumentException("invalid targetType: " + targetType);
        }

        String memKind = memoryKind(feedbackKind);
        int forgotten = memoryService.forget(memKind, type, targetId);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("targetType", type);
        out.put("targetId", targetId);
        out.put("kind", feedbackKind);
        out.put("withdrawn", true);
        out.put("forgotten", forgotten);

        if ("change".equals(type)) {
            EventEntity event = eventRepository.findById(targetId).orElse(null);
            if (event != null) {
                if ("irrelevant".equals(feedbackKind) || "ignore".equals(feedbackKind)) {
                    contextService.revertTopicFeedback(event.getTitle(), false);
                } else if ("useful".equals(feedbackKind)) {
                    contextService.revertTopicFeedback(event.getTitle(), true);
                }
                out.put("title", event.getTitle());
            }
            return out;
        }

        if (previousActionStatus != null && !previousActionStatus.isBlank()) {
            Map<String, Object> updated = actionService.patch(targetId, Map.of("status", previousActionStatus.trim()));
            out.put("action", updated);
        }
        return out;
    }

    private static String memoryKind(String kind) {
        return switch (kind) {
            case "useful" -> "useful";
            case "irrelevant", "ignore" -> "rejected";
            case "watch" -> "watch";
            case "tried" -> "tried";
            default -> kind;
        };
    }

    private static String actionStatus(String kind) {
        return switch (kind) {
            case "useful" -> "useful";
            case "irrelevant", "ignore" -> "ignored";
            case "watch" -> "watching";
            case "tried" -> "started";
            default -> "open";
        };
    }

    private static String payload(String kind) {
        return "{\"feedback\":\"" + kind + "\"}";
    }
}
