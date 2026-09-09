package com.airadar.api;

import com.airadar.feedback.FeedbackService;
import org.springframework.http.ResponseEntity;
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
        Long targetId = null;
        if (body.get("targetId") instanceof Number n) {
            targetId = n.longValue();
        } else if (body.get("targetId") != null) {
            targetId = Long.parseLong(body.get("targetId").toString());
        }
        String kind = body.get("kind") == null ? null : body.get("kind").toString();
        return ResponseEntity.ok(feedbackService.submit(targetType, targetId, kind));
    }
}
