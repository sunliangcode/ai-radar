package com.airadar.api;

import com.airadar.connector.CliSetupService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/sources")
public class SourceSetupController {

    private final CliSetupService cliSetupService;

    public SourceSetupController(CliSetupService cliSetupService) {
        this.cliSetupService = cliSetupService;
    }

    @GetMapping("/setup/batch")
    public Map<String, Object> setupStatusBatch(@RequestParam(name = "ids", required = false) String ids) {
        List<Long> idList = List.of();
        if (ids != null && !ids.isBlank()) {
            idList = Arrays.stream(ids.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .flatMap(s -> {
                        try {
                            return Stream.of(Long.parseLong(s));
                        } catch (NumberFormatException e) {
                            return Stream.empty();
                        }
                    })
                    .collect(Collectors.toList());
        }
        return cliSetupService.statusBatch(idList);
    }

    @GetMapping("/{id}/setup")
    public Map<String, Object> setupStatus(@PathVariable Long id) {
        return cliSetupService.status(id);
    }

    @PostMapping("/{id}/setup/install")
    public Map<String, Object> setupInstall(@PathVariable Long id) {
        return cliSetupService.install(id);
    }

    @PostMapping("/{id}/setup/probe")
    public Map<String, Object> setupProbe(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        String cookie = null;
        boolean enableOnSuccess = true;
        if (body != null) {
            Object c = body.get("cookie");
            if (c != null) {
                cookie = String.valueOf(c);
            }
            if (body.containsKey("enableOnSuccess")) {
                enableOnSuccess = Boolean.parseBoolean(String.valueOf(body.get("enableOnSuccess")));
            }
        }
        return cliSetupService.probe(id, cookie, enableOnSuccess);
    }
}
