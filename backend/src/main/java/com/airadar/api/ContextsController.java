package com.airadar.api;

import com.airadar.context.ContextService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/contexts")
public class ContextsController {

    private final ContextService contextService;

    public ContextsController(ContextService contextService) {
        this.contextService = contextService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> get() {
        return ResponseEntity.ok(contextService.getOrSeed());
    }

    @PutMapping
    public ResponseEntity<Map<String, Object>> put(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(contextService.save(body));
    }

    @PostMapping("/extract")
    public ResponseEntity<Map<String, Object>> extract(@RequestBody Map<String, Object> body) {
        Object text = body.get("text");
        return ResponseEntity.ok(contextService.extract(text == null ? "" : text.toString()));
    }

    @PostMapping("/import/markdown")
    public ResponseEntity<Map<String, Object>> importMarkdown(@RequestBody Map<String, Object> body) {
        Object md = body.get("markdown");
        return ResponseEntity.ok(contextService.importMarkdown(md == null ? "" : md.toString()));
    }

    @PostMapping("/import/github")
    public ResponseEntity<Map<String, Object>> importGithub(@RequestBody Map<String, Object> body) {
        Object url = body.get("url");
        return ResponseEntity.ok(contextService.importGithub(url == null ? "" : url.toString()));
    }
}
