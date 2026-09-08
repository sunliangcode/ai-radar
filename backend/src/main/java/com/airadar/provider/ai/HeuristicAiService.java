package com.airadar.provider.ai;

import com.airadar.config.RadarProperties;
import com.airadar.domain.NewsItem;
import com.airadar.domain.SourceType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class HeuristicAiService implements AiService {

    private static final List<String> AI_KEYWORDS = List.of(
            "ai", "llm", "gpt", "agent", "model", "openai", "anthropic", "claude",
            "推理", "大模型", "开源模型", "机器学习", "deep learning", "transformer",
            "rag", "embedding", "inference", "vllm", "ollama", "huggingface"
    );

    private static final List<String> OSS_KEYWORDS = List.of(
            "github", "open source", "开源", "apache", "mit license", "release", "repo"
    );

    private static final List<String> PRODUCT_KEYWORDS = List.of(
            "launch", "product", "api", "pricing", "发布", "产品", "saas"
    );

    private final RadarProperties properties;

    public HeuristicAiService(RadarProperties properties) {
        this.properties = properties;
    }

    @Override
    public List<ScoreResult> score(List<NewsItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        List<String> interestKeywords = parseInterestKeywords(properties.getInterestProfile());
        List<ScoreResult> results = new ArrayList<>(items.size());
        for (NewsItem item : items) {
            results.add(scoreOne(item, interestKeywords));
        }
        return results;
    }

    @Override
    public String summarize(NewsItem item) {
        String title = item.getTitle() == null ? "" : item.getTitle().trim();
        String snippet = item.getContentSnippet() == null ? "" : item.getContentSnippet().trim();
        String source = item.getPrimarySourceType() == null ? "web" : item.getPrimarySourceType().name();
        boolean zh = !"en".equalsIgnoreCase(properties.getSummaryLanguage());

        if (!snippet.isBlank()) {
            String body = truncate(snippet, 180);
            if (zh) {
                return "【" + source + "】" + (title.isBlank() ? "" : title + "。") + body;
            }
            return "[" + source + "] " + (title.isBlank() ? "" : title + ". ") + body;
        }
        if (zh) {
            return "【" + source + "】" + (title.isBlank() ? "相关资讯更新。" : title + "。");
        }
        return "[" + source + "] " + (title.isBlank() ? "Relevant update." : title + ".");
    }

    @Override
    public EventAssignResult assignEvent(NewsItem item, List<EventCandidate> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            String title = item.getTitle() == null ? "Untitled event" : truncate(item.getTitle(), 120);
            return EventAssignResult.create(title, 0.9, "no_candidates");
        }
        var itemEntities = com.airadar.event.EntityLexicon.extract(
                (item.getTitle() == null ? "" : item.getTitle()) + " " + (item.getContentSnippet() == null ? "" : item.getContentSnippet()));
        var itemTokens = com.airadar.event.EntityLexicon.tokens(item.getTitle());

        EventCandidate best = null;
        double bestScore = 0;
        for (EventCandidate c : candidates) {
            var cEntities = com.airadar.event.EntityLexicon.extract(
                    (c.title() == null ? "" : c.title()) + " " + (c.summary() == null ? "" : c.summary()));
            var cTokens = com.airadar.event.EntityLexicon.tokens(c.title());
            double entityOverlap = itemEntities.isEmpty() || cEntities.isEmpty()
                    ? 0
                    : com.airadar.event.EntityLexicon.jaccard(itemEntities, cEntities);
            double titleSim = com.airadar.event.EntityLexicon.jaccard(itemTokens, cTokens);
            double score = entityOverlap * 0.65 + titleSim * 0.35;
            if (score > bestScore) {
                bestScore = score;
                best = c;
            }
        }
        if (best != null && bestScore >= 0.35) {
            double confidence = Math.min(0.95, 0.5 + bestScore);
            if (confidence < 0.55) {
                String title = item.getTitle() == null ? "Untitled event" : truncate(item.getTitle(), 120);
                return EventAssignResult.create(title, confidence, "low_confidence_create");
            }
            return EventAssignResult.assign(best.id(), best.title(), confidence, "heuristic_match=" + String.format("%.2f", bestScore));
        }
        String title = item.getTitle() == null ? "Untitled event" : truncate(item.getTitle(), 120);
        return EventAssignResult.create(title, 0.85, "no_strong_match");
    }

    @Override
    public EventIntelligence refreshEventIntelligence(String eventTitle, List<NewsItem> memberItems) {
        boolean zh = !"en".equalsIgnoreCase(properties.getSummaryLanguage());
        int n = memberItems == null ? 0 : memberItems.size();
        String top = eventTitle == null ? "" : eventTitle;
        if (memberItems != null && !memberItems.isEmpty() && (memberItems.getFirst().getSummary() != null)) {
            top = memberItems.getFirst().getSummary();
        }
        if (zh) {
            return new EventIntelligence(
                    "事件「" + (eventTitle == null ? "" : eventTitle) + "」目前聚合 " + n + " 条相关资讯。" + truncate(nullToEmpty(top), 160),
                    "可能影响关注该主题的开发者、研究者与产品团队。",
                    "留意后续官方公告、开源仓库动态与社区讨论。"
            );
        }
        return new EventIntelligence(
                "Event \"" + (eventTitle == null ? "" : eventTitle) + "\" aggregates " + n + " related items. " + truncate(nullToEmpty(top), 160),
                "Likely relevant to developers, researchers, and product teams following this topic.",
                "Watch official announcements, repo activity, and community discussion."
        );
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    ScoreResult scoreOne(NewsItem item, List<String> interestKeywords) {
        String text = ((item.getTitle() == null ? "" : item.getTitle()) + " "
                + (item.getContentSnippet() == null ? "" : item.getContentSnippet()))
                .toLowerCase(Locale.ROOT);

        double score = 45;
        List<String> tags = new ArrayList<>();
        List<String> reasons = new ArrayList<>();

        int interestHits = 0;
        for (String kw : interestKeywords) {
            if (kw.length() >= 2 && text.contains(kw.toLowerCase(Locale.ROOT))) {
                interestHits++;
                if (tags.size() < 5) {
                    tags.add(kw);
                }
            }
        }
        if (interestHits > 0) {
            score += Math.min(30, interestHits * 10);
            reasons.add("兴趣词命中×" + interestHits);
        }

        int aiHits = countHits(text, AI_KEYWORDS);
        if (aiHits > 0) {
            score += Math.min(15, aiHits * 5);
            reasons.add("AI相关");
            if (!tags.contains("ai")) {
                tags.add("ai");
            }
        }

        score += metaBoost(item, reasons);
        score += sourceBoost(item.getPrimarySourceType());

        score = Math.max(0, Math.min(100, score));
        String category = detectCategory(text, item.getPrimarySourceType());
        if (reasons.isEmpty()) {
            reasons.add("通用启发式评分");
        }
        return new ScoreResult(score, String.join("；", reasons), tags, category);
    }

    private double metaBoost(NewsItem item, List<String> reasons) {
        Map<String, Object> meta = item.getRawMeta();
        if (meta == null || meta.isEmpty()) {
            return 0;
        }
        double boost = 0;
        Number points = asNumber(meta.get("points"));
        if (points != null) {
            double p = points.doubleValue();
            double b = Math.min(15, Math.log10(p + 1) * 8);
            boost += b;
            if (b >= 5) {
                reasons.add("HN热度");
            }
        }
        Number stars = asNumber(meta.get("stars"));
        if (stars != null) {
            double s = stars.doubleValue();
            double b = Math.min(20, Math.log10(s + 1) * 6);
            boost += b;
            if (b >= 5) {
                reasons.add("GitHub stars");
            }
        }
        Number redditScore = asNumber(meta.get("score"));
        if (redditScore != null && item.getPrimarySourceType() == SourceType.REDDIT) {
            double r = redditScore.doubleValue();
            double b = Math.min(12, Math.log10(Math.max(r, 0) + 1) * 6);
            boost += b;
            if (b >= 4) {
                reasons.add("Reddit热度");
            }
        }
        return boost;
    }

    private static double sourceBoost(SourceType type) {
        if (type == null) {
            return 0;
        }
        return switch (type) {
            case HACKER_NEWS -> 5;
            case GITHUB -> 6;
            case RSS -> 4;
            case REDDIT -> 3;
            case FIXTURE -> 2;
        };
    }

    private static String detectCategory(String text, SourceType type) {
        if (type == SourceType.GITHUB || countHits(text, OSS_KEYWORDS) > 0) {
            if (countHits(text, AI_KEYWORDS) > 0) {
                return "oss";
            }
            return "oss";
        }
        if (countHits(text, PRODUCT_KEYWORDS) > 0 && countHits(text, AI_KEYWORDS) > 0) {
            return "product";
        }
        if (countHits(text, AI_KEYWORDS) > 0) {
            return "ai";
        }
        return "other";
    }

    static List<String> parseInterestKeywords(String profile) {
        if (profile == null || profile.isBlank()) {
            return List.of();
        }
        Set<String> out = new LinkedHashSet<>();
        for (String part : profile.split("[,，、；;:/|\\s]+")) {
            String t = part.trim();
            if (t.length() >= 2) {
                out.add(t);
            }
        }
        return new ArrayList<>(out);
    }

    private static int countHits(String text, List<String> keywords) {
        int n = 0;
        for (String kw : keywords) {
            if (text.contains(kw.toLowerCase(Locale.ROOT))) {
                n++;
            }
        }
        return n;
    }

    private static Number asNumber(Object value) {
        if (value instanceof Number n) {
            return n;
        }
        if (value == null) {
            return null;
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String truncate(String text, int max) {
        return text.length() <= max ? text : text.substring(0, max) + "…";
    }
}
