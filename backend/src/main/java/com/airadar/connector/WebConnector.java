package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.SourceType;
import com.airadar.provider.ai.AiService;
import com.airadar.provider.ai.ExtractedItem;
import org.jsoup.Jsoup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class WebConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(WebConnector.class);
    private static final int MAX_CONTENT_CHARS = 100_000;

    private final RestClient.Builder restClientBuilder;
    private final AiService aiService;

    public WebConnector(RestClient.Builder restClientBuilder, AiService aiService) {
        this.restClientBuilder = restClientBuilder;
        this.aiService = aiService;
    }

    @Override
    public SourceType type() {
        return SourceType.WEB;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("WEB", "Web page + AI extract", List.of(
                ConnectorDescriptor.ConfigField.text("url", "Page URL", true),
                ConnectorDescriptor.ConfigField.text("extractionPrompt", "Extraction prompt", true)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        String url = ConnectorConfigs.string(ctx, "url", "");
        String prompt = ConnectorConfigs.string(ctx, "extractionPrompt", "Extract the top news or posts as items with title, url, and short content.");
        if (url.isBlank()) {
            log.warn("WEB source {} missing url", ctx.source().name());
            return List.of();
        }
        String html = restClientBuilder.build()
                .get()
                .uri(url)
                .header("User-Agent", "ai-radar/0.1")
                .retrieve()
                .body(String.class);
        String text = toReadableText(html == null ? "" : html, url);
        if (text.length() > MAX_CONTENT_CHARS) {
            text = text.substring(0, MAX_CONTENT_CHARS);
        }
        List<ExtractedItem> extracted = aiService.extractItems(text, prompt);
        return toRawItems(extracted, ctx, url);
    }

    List<RawItem> toRawItems(List<ExtractedItem> extracted, FetchContext ctx, String pageUrl) {
        List<RawItem> items = new ArrayList<>();
        if (extracted == null) {
            return items;
        }
        for (ExtractedItem item : extracted) {
            if (item == null || item.title() == null || item.title().isBlank()) {
                continue;
            }
            String link = item.url();
            if (link == null || link.isBlank()) {
                link = pageUrl;
            } else if (link.startsWith("/")) {
                try {
                    java.net.URI base = java.net.URI.create(pageUrl);
                    link = base.resolve(link).toString();
                } catch (Exception ignored) {
                    link = pageUrl;
                }
            }
            Map<String, Object> meta = new HashMap<>();
            meta.put("pageUrl", pageUrl);
            items.add(new RawItem(
                    item.title().trim(),
                    link,
                    Instant.now(),
                    SourceType.WEB,
                    String.valueOf(ctx.source().id()),
                    item.content() == null ? "" : item.content(),
                    meta
            ));
        }
        log.debug("WEB extracted {} items from {}", items.size(), pageUrl);
        return items;
    }

    static String toReadableText(String html, String baseUri) {
        return Jsoup.parse(html, baseUri).text();
    }
}
