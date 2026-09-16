package com.airadar.chat;

import com.airadar.change.ChangeService;
import com.airadar.config.RadarProperties;
import com.airadar.context.ContextService;
import com.airadar.provider.ai.OpenAiCompatibleAiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

@Service
public class ChatService {

    private final ChangeService changeService;
    private final ContextService contextService;
    private final OpenAiCompatibleAiService aiService;
    private final RadarProperties properties;
    private final ObjectMapper objectMapper;
    private final String systemTemplate;

    public ChatService(
            ChangeService changeService,
            ContextService contextService,
            OpenAiCompatibleAiService aiService,
            RadarProperties properties,
            ObjectMapper objectMapper
    ) throws IOException {
        this.changeService = changeService;
        this.contextService = contextService;
        this.aiService = aiService;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.systemTemplate = new ClassPathResource("prompts/chat_radar.md")
                .getContentAsString(StandardCharsets.UTF_8);
    }

    public record ChatTurnResult(String reply, List<Map<String, Object>> newlyCited, List<Long> citedChangeIds) {
    }

    @SuppressWarnings("unchecked")
    public ChatTurnResult stream(Map<String, Object> body, Consumer<String> onDelta) {
        if (!properties.getOpenai().isLlmReady()) {
            throw new IllegalStateException("LLM is not configured (set local Ollama URL/model or OPENAI_API_KEY)");
        }

        List<Map<String, String>> history = parseMessages(body.get("messages"));
        if (history.isEmpty()) {
            throw new IllegalArgumentException("messages are required");
        }

        Set<Long> cited = new LinkedHashSet<>();
        Object citedRaw = body.get("citedChangeIds");
        if (citedRaw instanceof List<?> list) {
            for (Object o : list) {
                Long id = asLong(o);
                if (id != null) {
                    cited.add(id);
                }
            }
        }

        Long seedChangeId = asLong(body.get("seedChangeId"));
        String lastUser = lastUserContent(history);

        List<Map<String, Object>> candidates = changeService.listRecent(40, null);
        // Ensure seed is in candidate pool even if not in recent top list
        if (seedChangeId != null) {
            boolean present = candidates.stream().anyMatch(c -> seedChangeId.equals(asLong(c.get("id"))));
            if (!present) {
                try {
                    candidates = new ArrayList<>(candidates);
                    candidates.add(0, changeService.get(seedChangeId));
                } catch (Exception ignored) {
                    // seed missing — continue without
                }
            }
        }

        List<Map<String, Object>> newlyCited = ChatNewsRetriever.pick(
                candidates, lastUser, cited, seedChangeId, ChatNewsRetriever.MAX_NEW_PER_TURN);

        for (Map<String, Object> card : newlyCited) {
            Long id = asLong(card.get("id"));
            if (id != null) {
                cited.add(id);
            }
        }

        String contextSummary = compactContext(contextService.payloadJson());
        String system = systemTemplate
                .replace("{{context}}", truncate(contextSummary, 1800))
                .replace("{{citedIds}}", cited.isEmpty() ? "(none)" : cited.toString())
                .replace("{{newsPack}}", ChatNewsRetriever.formatNewsPack(newlyCited));

        List<Map<String, String>> llmMessages = new ArrayList<>();
        llmMessages.add(Map.of("role", "system", "content", system));
        for (Map<String, String> m : history) {
            String role = m.getOrDefault("role", "user");
            if ("system".equals(role)) {
                continue;
            }
            if (!"assistant".equals(role) && !"user".equals(role)) {
                role = "user";
            }
            llmMessages.add(Map.of("role", role, "content", truncate(m.getOrDefault("content", ""), 4000)));
        }

        String reply = aiService.chatTextStream(llmMessages, onDelta == null ? delta -> {
        } : onDelta);

        return new ChatTurnResult(reply, newlyCited, new ArrayList<>(cited));
    }

    private String compactContext(String payloadJson) {
        try {
            Map<String, Object> payload = objectMapper.readValue(payloadJson, Map.class);
            Map<String, Object> slim = new LinkedHashMap<>();
            if (payload.get("profile") != null) {
                slim.put("profile", payload.get("profile"));
            }
            copyIfPresent(payload, slim, "technologies");
            copyIfPresent(payload, slim, "interests");
            copyIfPresent(payload, slim, "current_focus");
            copyIfPresent(payload, slim, "explicit_ignore");
            copyIfPresent(payload, slim, "goals");
            if (payload.get("projects") instanceof List<?> projects && !projects.isEmpty()) {
                List<Object> shortProjects = projects.stream().limit(5).map(p -> {
                    if (p instanceof Map<?, ?> m) {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("name", m.get("name"));
                        row.put("stack", m.get("stack"));
                        return row;
                    }
                    return p;
                }).toList();
                slim.put("projects", shortProjects);
            }
            return objectMapper.writeValueAsString(slim);
        } catch (Exception e) {
            return truncate(payloadJson == null ? "{}" : payloadJson, 1800);
        }
    }

    private static void copyIfPresent(Map<String, Object> from, Map<String, Object> to, String key) {
        Object v = from.get(key);
        if (v != null) {
            to.put(key, v);
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, String>> parseMessages(Object raw) {
        if (!(raw instanceof List<?> list) || list.isEmpty()) {
            return List.of();
        }
        List<Map<String, String>> out = new ArrayList<>();
        for (Object o : list) {
            if (!(o instanceof Map<?, ?> m)) {
                continue;
            }
            Object role = m.get("role");
            Object content = m.get("content");
            if (content == null) {
                continue;
            }
            out.add(Map.of(
                    "role", role == null ? "user" : role.toString(),
                    "content", content.toString()
            ));
        }
        return out;
    }

    private static String lastUserContent(List<Map<String, String>> history) {
        for (int i = history.size() - 1; i >= 0; i--) {
            Map<String, String> m = history.get(i);
            if ("user".equals(m.get("role"))) {
                return m.getOrDefault("content", "");
            }
        }
        return history.getLast().getOrDefault("content", "");
    }

    private static Long asLong(Object v) {
        if (v instanceof Number n) {
            return n.longValue();
        }
        if (v == null) {
            return null;
        }
        try {
            return Long.parseLong(v.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String truncate(String text, int max) {
        if (text == null) {
            return "";
        }
        return text.length() <= max ? text : text.substring(0, max) + "…";
    }
}
