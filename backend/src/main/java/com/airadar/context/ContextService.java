package com.airadar.context;

import com.airadar.api.ApiTimes;
import com.airadar.provider.ai.AiService;
import com.airadar.provider.ai.ContextExtractResult;
import com.airadar.settings.SettingsService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ContextService {

    private static final Pattern GITHUB_REPO = Pattern.compile(
            "https?://github\\.com/([^/\\s]+)/([^/\\s?#]+)", Pattern.CASE_INSENSITIVE);

    private final ContextRepository repository;
    private final AiService aiService;
    private final SettingsService settingsService;
    private final ObjectMapper objectMapper;
    private final RestClient.Builder restClientBuilder;

    public ContextService(
            ContextRepository repository,
            AiService aiService,
            SettingsService settingsService,
            ObjectMapper objectMapper,
            RestClient.Builder restClientBuilder
    ) {
        this.repository = repository;
        this.aiService = aiService;
        this.settingsService = settingsService;
        this.objectMapper = objectMapper;
        this.restClientBuilder = restClientBuilder;
    }

    @Transactional
    public Map<String, Object> getOrSeed() {
        UserContextEntity row = repository.findById(1L).orElse(null);
        if (row == null) {
            row = seedFromInterest();
            repository.save(row);
        }
        return toDto(row);
    }

    @Transactional
    public Map<String, Object> save(Map<String, Object> body) {
        UserContextEntity row = repository.findById(1L).orElseGet(() -> {
            UserContextEntity e = new UserContextEntity();
            e.setId(1L);
            return e;
        });
        Map<String, Object> payload = extractPayload(body);
        try {
            row.setPayloadJson(objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            throw new IllegalArgumentException("invalid context payload");
        }
        if (body.containsKey("rawText")) {
            row.setRawText(asString(body.get("rawText")));
        }
        if (body.containsKey("source")) {
            row.setSource(asString(body.get("source")));
        } else if (row.getSource() == null) {
            row.setSource("manual");
        }
        repository.save(row);
        syncInterestProfile(payload);
        return toDto(row);
    }

    @Transactional(readOnly = true)
    public String payloadJson() {
        return repository.findById(1L).map(UserContextEntity::getPayloadJson).orElse("{}");
    }

    @Transactional
    public Map<String, Object> extract(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("text is required");
        }
        ContextExtractResult extracted = aiService.extractContext(text);
        Map<String, Object> payload = toPayloadMap(extracted);
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("payload", payload);
        dto.put("rawText", text);
        dto.put("source", "extract");
        return dto;
    }

    @Transactional
    public Map<String, Object> importMarkdown(String markdown) {
        Map<String, Object> draft = extract(markdown);
        draft.put("source", "markdown");
        return draft;
    }

    @Transactional
    public Map<String, Object> importGithub(String url) {
        Matcher m = GITHUB_REPO.matcher(url == null ? "" : url.trim());
        if (!m.find()) {
            throw new IllegalArgumentException("invalid GitHub repository URL");
        }
        String owner = m.group(1);
        String repo = m.group(2).replaceAll("\\.git$", "");
        String readme = fetchGithubRaw(owner, repo, "README.md");
        if (readme == null || readme.isBlank()) {
            readme = fetchGithubRaw(owner, repo, "readme.md");
        }
        String pom = fetchGithubRaw(owner, repo, "pom.xml");
        StringBuilder blob = new StringBuilder();
        blob.append("GitHub repository: ").append(owner).append('/').append(repo).append('\n');
        if (readme != null) {
            blob.append(readme, 0, Math.min(readme.length(), 6000)).append('\n');
        }
        List<String> stack = new ArrayList<>();
        if (pom != null && !pom.isBlank()) {
            blob.append("pom.xml excerpt:\n").append(pom, 0, Math.min(pom.length(), 3000));
            if (pom.contains("spring-boot")) {
                stack.add("Spring Boot");
            }
            if (pom.contains("groupId>org.springframework")) {
                stack.add("Spring");
            }
            stack.add("Java");
            if (pom.contains("mysql")) {
                stack.add("MySQL");
            }
            if (pom.contains("redis")) {
                stack.add("Redis");
            }
        }
        Map<String, Object> draft = extract(blob.toString());
        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) draft.get("payload");
        List<Map<String, Object>> projects = new ArrayList<>();
        Map<String, Object> project = new LinkedHashMap<>();
        project.put("name", repo);
        project.put("type", "github");
        project.put("stack", stack);
        project.put("url", "https://github.com/" + owner + "/" + repo);
        projects.add(project);
        payload.put("projects", projects);
        if (!stack.isEmpty()) {
            @SuppressWarnings("unchecked")
            List<String> tech = payload.get("technologies") instanceof List<?> list
                    ? new ArrayList<>((List<String>) list)
                    : new ArrayList<>();
            for (String s : stack) {
                if (!tech.contains(s)) {
                    tech.add(s);
                }
            }
            payload.put("technologies", tech);
        }
        draft.put("payload", payload);
        draft.put("source", "github");
        draft.put("rawText", blob.substring(0, Math.min(blob.length(), 4000)));
        return draft;
    }

    private String fetchGithubRaw(String owner, String repo, String path) {
        try {
            return restClientBuilder.build()
                    .get()
                    .uri("https://raw.githubusercontent.com/{owner}/{repo}/HEAD/{path}", owner, repo, path)
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            return null;
        }
    }

    private UserContextEntity seedFromInterest() {
        String interest = settingsService.effective().interestProfile();
        ContextExtractResult extracted = aiService.extractContext(
                interest == null || interest.isBlank() ? "AI, software engineering" : interest);
        UserContextEntity row = new UserContextEntity();
        row.setId(1L);
        row.setSource("settings-seed");
        row.setRawText(interest);
        try {
            row.setPayloadJson(objectMapper.writeValueAsString(toPayloadMap(extracted)));
        } catch (Exception e) {
            row.setPayloadJson("{\"interests\":[]}");
        }
        return row;
    }

    private void syncInterestProfile(Map<String, Object> payload) {
        List<String> parts = new ArrayList<>();
        Object interests = payload.get("interests");
        if (interests instanceof List<?> list) {
            for (Object o : list) {
                if (o != null && !o.toString().isBlank()) {
                    parts.add(o.toString());
                }
            }
        }
        Object tech = payload.get("technologies");
        if (tech instanceof List<?> list) {
            for (Object o : list) {
                if (o != null && !o.toString().isBlank() && !parts.contains(o.toString())) {
                    parts.add(o.toString());
                }
            }
        }
        if (parts.isEmpty()) {
            return;
        }
        String summary = String.join("、", parts.subList(0, Math.min(parts.size(), 12)));
        settingsService.update(Map.of("interestProfile", summary));
    }

    private Map<String, Object> extractPayload(Map<String, Object> body) {
        if (body.containsKey("payload") && body.get("payload") instanceof Map<?, ?> nested) {
            return objectMapper.convertValue(nested, new TypeReference<>() {
            });
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        for (String key : List.of("profile", "projects", "technologies", "interests", "goals", "preferences")) {
            if (body.containsKey(key)) {
                payload.put(key, body.get(key));
            }
        }
        if (payload.isEmpty()) {
            throw new IllegalArgumentException("payload is required");
        }
        return payload;
    }

    private Map<String, Object> toPayloadMap(ContextExtractResult r) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("profile", r.profile() == null ? Map.of() : r.profile());
        payload.put("projects", r.projects() == null ? List.of() : r.projects());
        payload.put("technologies", r.technologies() == null ? List.of() : r.technologies());
        payload.put("interests", r.interests() == null ? List.of() : r.interests());
        payload.put("goals", r.goals() == null ? List.of() : r.goals());
        payload.put("preferences", r.preferences() == null ? Map.of() : r.preferences());
        return payload;
    }

    private Map<String, Object> toDto(UserContextEntity row) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", row.getId());
        try {
            dto.put("payload", objectMapper.readValue(row.getPayloadJson(), new TypeReference<Map<String, Object>>() {
            }));
        } catch (Exception e) {
            dto.put("payload", Map.of());
        }
        dto.put("rawText", row.getRawText());
        dto.put("source", row.getSource());
        dto.put("createdAt", ApiTimes.iso(row.getCreatedAt()));
        dto.put("updatedAt", ApiTimes.iso(row.getUpdatedAt()));
        return dto;
    }

    private static String asString(Object v) {
        return v == null ? null : v.toString();
    }
}
