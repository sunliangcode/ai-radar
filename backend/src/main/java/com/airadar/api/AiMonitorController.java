package com.airadar.api;

import com.airadar.job.FetchProgress;
import com.airadar.provider.ai.AiCallMonitor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiMonitorController {

    private final AiCallMonitor monitor;
    private final FetchProgress fetchProgress;

    public AiMonitorController(AiCallMonitor monitor, FetchProgress fetchProgress) {
        this.monitor = monitor;
        this.fetchProgress = fetchProgress;
    }

    @GetMapping("/monitor")
    public Map<String, Object> monitor() {
        Map<String, Object> snap = new LinkedHashMap<>(monitor.snapshot());
        Object analysis = fetchProgress.snapshot().get("analysis");
        if (analysis instanceof Map<?, ?> m) {
            Map<String, Object> queue = new LinkedHashMap<>();
            for (Map.Entry<?, ?> e : m.entrySet()) {
                if (e.getKey() != null) {
                    queue.put(String.valueOf(e.getKey()), e.getValue());
                }
            }
            snap.put("queue", queue);
        }
        return snap;
    }

    @GetMapping(value = "/monitor/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return monitor.subscribe();
    }
}
