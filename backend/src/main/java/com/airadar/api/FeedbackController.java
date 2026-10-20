package com.airadar.api;

import com.airadar.feedback.FeedbackService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PostMapping("/feedback")
    public ResponseEntity<Map<String, Object>> submit(@RequestBody Map<String, Object> body) {
        String targetType = body.get("targetType") == null ? null : body.get("targetType").toString();
        Long targetId = parseId(body.get("targetId"));
        String kind = body.get("kind") == null ? null : body.get("kind").toString();
        return ResponseEntity.ok(feedbackService.submit(targetType, targetId, kind));
    }

    /** Undo feedback (forget memory; reverse topic nudge; optional action status restore). */
    @DeleteMapping("/feedback")
    public ResponseEntity<Map<String, Object>> withdraw(@RequestBody Map<String, Object> body) {
        String targetType = body.get("targetType") == null ? null : body.get("targetType").toString();
        Long targetId = parseId(body.get("targetId"));
        String kind = body.get("kind") == null ? null : body.get("kind").toString();
        String previousActionStatus = body.get("previousActionStatus") == null
                ? null
                : body.get("previousActionStatus").toString();
        return ResponseEntity.ok(feedbackService.withdraw(targetType, targetId, kind, previousActionStatus));
    }

    private static Long parseId(Object raw) {
        if (raw instanceof Number n) {
            return n.longValue();
        }
        if (raw != null) {
            return Long.parseLong(raw.toString());
        }
        return null;
    }
}
