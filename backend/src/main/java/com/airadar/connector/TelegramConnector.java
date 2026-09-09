package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.SourceType;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class TelegramConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(TelegramConnector.class);
    private static final String[] WEB_BASES = {
            "https://t.me/s/",
            "https://telegram.me/s/",
            "https://telegram.dog/s/"
    };
    private static final String LINK_BASE = "https://t.me/";
    private static final Pattern SENTENCE_END = Pattern.compile("[。！？]");
    private static final String USER_AGENT =
            "Mozilla/5.0 (compatible; ai-radar/0.1; +https://github.com/sunliangcode/ai-radar)";

    private final RestClient.Builder restClientBuilder;

    public TelegramConnector(RestClient.Builder restClientBuilder) {
        this.restClientBuilder = restClientBuilder;
    }

    @Override
    public SourceType type() {
        return SourceType.TELEGRAM;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("TELEGRAM", "Telegram Channel", List.of(
                ConnectorDescriptor.ConfigField.text("channels", "Public channels (comma-separated)", true),
                ConnectorDescriptor.ConfigField.text("fetchLimit", "Messages per channel", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        List<String> channels = ConnectorConfigs.stringList(ctx, "channels", List.of());
        if (channels.isEmpty()) {
            log.warn("Telegram source {} missing channels", ctx.source().name());
            return List.of();
        }
        int fetchLimit = ConnectorConfigs.integer(ctx, "fetchLimit", 30);
        List<RawItem> all = new ArrayList<>();
        for (String channel : channels) {
            String name = channel.replaceFirst("^@", "").trim();
            if (name.isBlank()) {
                continue;
            }
            String html = fetchChannelHtml(name);
            all.addAll(parseChannelHtml(html, ctx, name, fetchLimit));
        }
        log.debug("Telegram fetched {} messages for {}", all.size(), ctx.source().name());
        return all;
    }

    private String fetchChannelHtml(String channel) {
        Exception last = null;
        for (String base : WEB_BASES) {
            try {
                return restClientBuilder.build()
                        .get()
                        .uri(base + channel)
                        .header("User-Agent", USER_AGENT)
                        .retrieve()
                        .body(String.class);
            } catch (Exception e) {
                last = e;
                log.warn("Telegram fetch failed for {} via {}: {}", channel, base, e.getMessage());
            }
        }
        throw new IllegalStateException(
                "All Telegram endpoints failed for " + channel + ": " + (last == null ? "unknown" : last.getMessage()),
                last
        );
    }

    List<RawItem> parseChannelHtml(String html, FetchContext ctx, String channel, int fetchLimit) {
        List<RawItem> items = new ArrayList<>();
        if (html == null || html.isBlank()) {
            return items;
        }
        Document doc = Jsoup.parse(html);
        Elements messages = doc.select("div.tgme_widget_message[data-post]");
        int start = Math.max(0, messages.size() - fetchLimit);
        for (int i = start; i < messages.size(); i++) {
            Element msg = messages.get(i);
            RawItem item = parseMessage(msg, ctx, channel);
            if (item != null) {
                items.add(item);
            }
        }
        return items;
    }

    private RawItem parseMessage(Element msg, FetchContext ctx, String channel) {
        String dataPost = msg.attr("data-post");
        String msgId = dataPost.contains("/") ? dataPost.substring(dataPost.lastIndexOf('/') + 1) : dataPost;
        if (msgId.isBlank()) {
            return null;
        }
        Element timeEl = msg.selectFirst("time[datetime]");
        if (timeEl == null) {
            return null;
        }
        Instant published;
        try {
            published = Instant.parse(timeEl.attr("datetime").replace(" ", "T"));
        } catch (Exception e) {
            try {
                published = Instant.parse(timeEl.attr("datetime"));
            } catch (Exception e2) {
                return null;
            }
        }
        if (published.isBefore(ctx.since())) {
            return null;
        }
        Element textEl = msg.selectFirst("div.tgme_widget_message_text");
        if (textEl == null) {
            return null;
        }
        String text = textEl.wholeText().trim();
        if (text.isBlank()) {
            return null;
        }
        String msgUrl = LINK_BASE + channel + "/" + msgId;
        String canonical = msgUrl;
        for (Element a : textEl.select("a[href]")) {
            String href = a.attr("href");
            if (href.startsWith("http") && !href.contains("t.me")) {
                canonical = href;
                break;
            }
        }
        Map<String, Object> meta = new HashMap<>();
        meta.put("channel", channel);
        meta.put("msg_url", msgUrl);
        meta.put("msg_id", msgId);
        return new RawItem(
                makeTitle(text),
                canonical,
                published,
                SourceType.TELEGRAM,
                String.valueOf(ctx.source().id()),
                text.length() > 2000 ? text.substring(0, 2000) : text,
                meta
        );
    }

    static String makeTitle(String text) {
        String firstPara = text.split("\\n\\n", 2)[0].replace('\n', ' ').trim();
        if (firstPara.length() <= 80) {
            return firstPara;
        }
        Matcher m = SENTENCE_END.matcher(firstPara.substring(0, 80));
        if (m.find()) {
            return firstPara.substring(0, m.end());
        }
        return firstPara.substring(0, 80);
    }
}
