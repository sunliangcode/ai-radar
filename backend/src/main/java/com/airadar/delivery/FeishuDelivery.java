package com.airadar.delivery;

import com.airadar.settings.SettingsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class FeishuDelivery implements DeliveryChannel {

    private static final Logger log = LoggerFactory.getLogger(FeishuDelivery.class);
    private static final int MAX_CHARS = 3500;

    private final SettingsService settingsService;
    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;

    public FeishuDelivery(
            SettingsService settingsService,
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper
    ) {
        this.settingsService = settingsService;
        this.restClientBuilder = restClientBuilder;
        this.objectMapper = objectMapper;
    }

    @Override
    public String channel() {
        return "feishu";
    }

    @Override
    public boolean isEnabled() {
        String url = settingsService.effective().feishuWebhookUrl();
        return url != null && !url.isBlank();
    }

    @Override
    public DeliveryResult deliver(BriefPayload payload) {
        long started = System.currentTimeMillis();
        if (!isEnabled()) {
            return DeliveryResult.skipped(channel(), "not_configured");
        }
        String webhook = settingsService.effective().feishuWebhookUrl();
        try {
            String text = buildMarkdown(payload);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("msg_type", "interactive");
            Map<String, Object> card = new LinkedHashMap<>();
            Map<String, Object> header = new LinkedHashMap<>();
            Map<String, Object> title = new LinkedHashMap<>();
            title.put("tag", "plain_text");
            title.put("content", "AI Radar 日报 · " + payload.date());
            header.put("title", title);
            header.put("template", "blue");
            card.put("header", header);

            List<Map<String, Object>> elements = new ArrayList<>();
            Map<String, Object> md = new LinkedHashMap<>();
            md.put("tag", "div");
            Map<String, Object> mdText = new LinkedHashMap<>();
            mdText.put("tag", "lark_md");
            mdText.put("content", text);
            md.put("text", mdText);
            elements.add(md);
            card.put("elements", elements);
            body.put("card", card);

            restClientBuilder.build()
                    .post()
                    .uri(webhook)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(objectMapper.writeValueAsString(body))
                    .retrieve()
                    .toBodilessEntity();

            long ms = System.currentTimeMillis() - started;
            log.info("delivery channel=feishu success=true items={} durationMs={}", payload.items().size(), ms);
            return DeliveryResult.ok(channel(), payload.items().size(), ms);
        } catch (Exception e) {
            long ms = System.currentTimeMillis() - started;
            log.error("delivery channel=feishu success=false error={}", e.getMessage());
            return DeliveryResult.fail(channel(), payload.items().size(), ms, e.getMessage());
        }
    }

    String buildMarkdown(BriefPayload payload) {
        StringBuilder sb = new StringBuilder();
        if (payload.events() != null && !payload.events().isEmpty()) {
            for (BriefPayload.BriefEvent event : payload.events()) {
                String block = String.format(
                        "**[%d · %s]** %s\n%s\n%s\n\n",
                        (int) Math.round(event.score()),
                        event.status() == null ? "" : event.status(),
                        event.title(),
                        event.summary() == null ? "" : event.summary(),
                        event.watchNext() == null ? "" : "关注：" + event.watchNext()
                );
                if (sb.length() + block.length() > MAX_CHARS) {
                    break;
                }
                sb.append(block);
            }
        } else {
            int shown = 0;
            for (BriefPayload.BriefItem item : payload.items()) {
                String block = String.format(
                        "**[%d]** [%s](%s)\n%s\n\n",
                        (int) Math.round(item.score()),
                        item.title(),
                        item.url(),
                        item.summary() == null ? "" : item.summary()
                );
                if (sb.length() + block.length() > MAX_CHARS) {
                    break;
                }
                sb.append(block);
                shown++;
            }
            if (shown < payload.items().size()) {
                String more = payload.uiUrl() != null && !payload.uiUrl().isBlank()
                        ? payload.uiUrl() + "/briefs/" + payload.date()
                        : "原文链接见上方条目";
                sb.append("---\n查看更多：").append(more);
                return sb.toString();
            }
        }
        if (payload.uiUrl() != null && !payload.uiUrl().isBlank()) {
            sb.append("---\n[打开 AI Radar](").append(payload.uiUrl()).append(")");
        }
        return sb.toString();
    }
}
