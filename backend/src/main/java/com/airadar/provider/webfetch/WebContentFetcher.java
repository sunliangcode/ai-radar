package com.airadar.provider.webfetch;

import com.airadar.config.RadarProperties;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.util.Set;

/**
 * Optional full-article fetch for short feed snippets (Readability-style via Jsoup).
 */
@Component
public class WebContentFetcher {

    private static final Logger log = LoggerFactory.getLogger(WebContentFetcher.class);
    private static final Set<String> BLOCKED_HOSTS = Set.of(
            "localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"
    );

    private final RestClient.Builder restClientBuilder;
    private final RadarProperties properties;

    public WebContentFetcher(RestClient.Builder restClientBuilder, RadarProperties properties) {
        this.restClientBuilder = restClientBuilder;
        this.properties = properties;
    }

    public boolean isEnabled() {
        return properties.getWebFetch().isEnabled();
    }

    public String fetchArticleText(String url) {
        if (!isEnabled() || url == null || url.isBlank() || !url.startsWith("http")) {
            return null;
        }
        if (isBlocked(url)) {
            log.warn("web_fetch_blocked url={}", url);
            return null;
        }
        try {
            String html = restClientBuilder.build()
                    .get()
                    .uri(url)
                    .header("User-Agent", properties.getWebFetch().getUserAgent())
                    .retrieve()
                    .body(String.class);
            if (html == null || html.isBlank()) {
                return null;
            }
            Document doc = Jsoup.parse(html, url);
            Element article = doc.selectFirst("article");
            if (article == null) {
                article = doc.selectFirst("main");
            }
            if (article == null) {
                article = doc.body();
            }
            if (article == null) {
                return null;
            }
            String text = article.text().trim();
            int max = properties.getWebFetch().getMaxChars();
            if (text.length() > max) {
                text = text.substring(0, max);
            }
            return text.isBlank() ? null : text;
        } catch (Exception e) {
            log.debug("web_fetch_failed url={} error={}", url, e.getMessage());
            return null;
        }
    }

    private static boolean isBlocked(String url) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (host == null) {
                return true;
            }
            String lower = host.toLowerCase();
            if (BLOCKED_HOSTS.contains(lower) || lower.endsWith(".local") || lower.endsWith(".internal")) {
                return true;
            }
            if (lower.startsWith("10.") || lower.startsWith("192.168.") || lower.startsWith("169.254.")) {
                return true;
            }
            return false;
        } catch (Exception e) {
            return true;
        }
    }
}
