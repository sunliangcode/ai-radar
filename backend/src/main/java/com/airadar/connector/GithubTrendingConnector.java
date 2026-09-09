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
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class GithubTrendingConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(GithubTrendingConnector.class);
    private static final String BASE_URL = "https://github.com/trending";
    private static final Pattern NUM = Pattern.compile("[\\d,]+");
    private static final String USER_AGENT =
            "Mozilla/5.0 (compatible; ai-radar/0.1; +https://github.com/sunliangcode/ai-radar)";

    private final RestClient.Builder restClientBuilder;

    public GithubTrendingConnector(RestClient.Builder restClientBuilder) {
        this.restClientBuilder = restClientBuilder;
    }

    @Override
    public SourceType type() {
        return SourceType.GITHUB_TRENDING;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("GITHUB_TRENDING", "GitHub Trending", List.of(
                ConnectorDescriptor.ConfigField.text("since", "since (daily|weekly|monthly)", false),
                ConnectorDescriptor.ConfigField.text("language", "Language slug", false),
                ConnectorDescriptor.ConfigField.text("spokenLanguage", "Spoken language code", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        String since = ConnectorConfigs.string(ctx, "since", "daily");
        String language = ConnectorConfigs.string(ctx, "language", "");
        String spoken = ConnectorConfigs.string(ctx, "spokenLanguage", "");

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(BASE_URL);
        if (!language.isBlank()) {
            builder.pathSegment(language);
        }
        builder.queryParam("since", since);
        if (!spoken.isBlank()) {
            builder.queryParam("spoken_language_code", spoken);
        }

        String html = restClientBuilder.build()
                .get()
                .uri(builder.build().toUriString())
                .header("User-Agent", USER_AGENT)
                .header("Accept", "text/html")
                .retrieve()
                .body(String.class);
        return parseHtml(html, ctx, since);
    }

    List<RawItem> parseHtml(String html, FetchContext ctx, String since) {
        List<RawItem> items = new ArrayList<>();
        if (html == null || html.isBlank()) {
            return items;
        }
        Document doc = Jsoup.parse(html);
        Elements articles = doc.select("article.Box-row");
        for (Element article : articles) {
            Element link = article.selectFirst("h2 a");
            if (link == null) {
                continue;
            }
            String href = link.attr("href").trim();
            if (href.isBlank()) {
                continue;
            }
            String fullName = href.replaceFirst("^/", "");
            String url = "https://github.com/" + fullName;
            Element desc = article.selectFirst("p");
            String description = desc == null ? "" : desc.text().trim();
            Element lang = article.selectFirst("span[itemprop=programmingLanguage]");
            String language = lang == null ? "" : lang.text().trim();

            int starsTotal = 0;
            Element starLink = article.selectFirst("a[href$=/stargazers]");
            if (starLink != null) {
                starsTotal = parseInt(starLink.text());
            }
            int starsToday = 0;
            for (Element span : article.select("span")) {
                String t = span.text();
                if (t.contains("stars today") || t.contains("stars this week") || t.contains("stars this month")) {
                    starsToday = parseInt(t);
                    break;
                }
            }

            Map<String, Object> meta = new HashMap<>();
            meta.put("fullName", fullName);
            meta.put("language", language);
            meta.put("stars_total", starsTotal);
            meta.put("stars_today", starsToday);
            meta.put("since", since);

            String title = fullName + (starsToday > 0 ? " (+" + starsToday + "⭐ " + since + ")" : "");
            items.add(new RawItem(
                    title,
                    url,
                    Instant.now(),
                    SourceType.GITHUB_TRENDING,
                    String.valueOf(ctx.source().id()),
                    description,
                    meta
            ));
        }
        log.debug("GitHub Trending fetched {} repos for {}", items.size(), ctx.source().name());
        return items;
    }

    private static int parseInt(String text) {
        Matcher m = NUM.matcher(text == null ? "" : text);
        if (!m.find()) {
            return 0;
        }
        return Integer.parseInt(m.group().replace(",", ""));
    }
}
