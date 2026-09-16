package com.airadar.api;

import com.airadar.chat.ChatService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final ExecutorService executor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "radar-chat");
        t.setDaemon(true);
        return t;
    });

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /** Streaming chat (preferred for Ollama). Events: {@code delta}, {@code done}, {@code error}. */
    @PostMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestBody Map<String, Object> body) {
        SseEmitter emitter = new SseEmitter(300_000L);
        executor.execute(() -> {
            try {
                ChatService.ChatTurnResult result = chatService.stream(body, delta -> {
                    try {
                        emitter.send(SseEmitter.event().name("delta").data(delta));
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                });
                Map<String, Object> done = new LinkedHashMap<>();
                done.put("reply", result.reply());
                done.put("newlyCited", result.newlyCited());
                done.put("citedChangeIds", result.citedChangeIds());
                emitter.send(SseEmitter.event().name("done").data(done));
                emitter.complete();
            } catch (Exception e) {
                try {
                    Map<String, Object> err = new LinkedHashMap<>();
                    err.put("message", e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
                    emitter.send(SseEmitter.event().name("error").data(err));
                } catch (Exception ignored) {
                    // client gone
                }
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }

    /** Non-streaming fallback (tests / clients that cannot read SSE). */
    @PostMapping(value = "/sync", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> sync(@RequestBody Map<String, Object> body) {
        StringBuilder buf = new StringBuilder();
        ChatService.ChatTurnResult result = chatService.stream(body, buf::append);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("reply", result.reply());
        out.put("newlyCited", result.newlyCited());
        out.put("citedChangeIds", result.citedChangeIds());
        return ResponseEntity.ok(out);
    }
}
