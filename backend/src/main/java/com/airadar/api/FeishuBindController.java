package com.airadar.api;

import com.airadar.delivery.FeishuBindService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/delivery/feishu")
public class FeishuBindController {

    private final FeishuBindService bindService;

    public FeishuBindController(FeishuBindService bindService) {
        this.bindService = bindService;
    }

    @PostMapping("/bind/start")
    public Map<String, Object> start() {
        return bindService.start();
    }

    @GetMapping("/bind/{sessionId}")
    public ResponseEntity<Map<String, Object>> status(@PathVariable String sessionId) {
        Map<String, Object> body = bindService.status(sessionId);
        if ("expired".equals(body.get("status"))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(body);
    }

    @DeleteMapping("/bind")
    public Map<String, Object> unbind() {
        bindService.unbind();
        return Map.of("ok", true, "feishuBound", false);
    }
}
