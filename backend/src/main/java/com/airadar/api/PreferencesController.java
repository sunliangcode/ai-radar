package com.airadar.api;

import com.airadar.preference.PreferenceKeywordService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/preferences")
public class PreferencesController {

    private final PreferenceKeywordService preferenceKeywordService;

    public PreferencesController(PreferenceKeywordService preferenceKeywordService) {
        this.preferenceKeywordService = preferenceKeywordService;
    }

    @GetMapping("/keywords")
    public Map<String, Object> list(@RequestParam(required = false) String kind) {
        List<Map<String, Object>> keywords = preferenceKeywordService.list(kind);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("keywords", keywords);
        return out;
    }

    @PostMapping("/keywords")
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        String kind = body.get("kind") == null ? null : String.valueOf(body.get("kind"));
        String text = body.get("text") == null ? null : String.valueOf(body.get("text"));
        return preferenceKeywordService.add(kind, text, PreferenceKeywordService.SOURCE_MANUAL, null);
    }

    @DeleteMapping("/keywords/{id}")
    public Map<String, Object> delete(@PathVariable Long id) {
        preferenceKeywordService.delete(id);
        return Map.of("ok", true);
    }
}
