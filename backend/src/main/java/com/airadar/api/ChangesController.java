package com.airadar.api;

import com.airadar.change.ChangeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ChangesController {

    private final ChangeService changeService;

    public ChangesController(ChangeService changeService) {
        this.changeService = changeService;
    }

    @GetMapping("/changes")
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "40") int limit) {
        return changeService.listRecent(limit);
    }

    @GetMapping("/changes/{id}")
    public Map<String, Object> get(@PathVariable Long id) {
        return changeService.get(id);
    }
}
