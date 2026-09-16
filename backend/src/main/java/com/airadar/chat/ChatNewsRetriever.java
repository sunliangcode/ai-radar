package com.airadar.chat;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Picks a small number of new Change cards per chat turn (token-budget friendly).
 * Pure scoring — no I/O.
 */
public final class ChatNewsRetriever {

    public static final int MAX_NEW_PER_TURN = 2;

    private static final Pattern TOKEN_SPLIT = Pattern.compile("[^\\p{IsAlphabetic}\\p{IsDigit}+#.]+");

    private ChatNewsRetriever() {
    }

    /**
     * @param candidates recent changes (maps with id/title/summary/why/tier/…)
     * @param userQuestion latest user message
     * @param alreadyCited change ids already injected in prior turns
     * @param seedChangeId optional change to force-include first (detail-page deep link)
     * @param maxNew max newly cited cards this turn
     */
    public static List<Map<String, Object>> pick(
            List<Map<String, Object>> candidates,
            String userQuestion,
            Collection<Long> alreadyCited,
            Long seedChangeId,
            int maxNew
    ) {
        int limit = Math.max(0, Math.min(maxNew, MAX_NEW_PER_TURN));
        if (limit == 0 || candidates == null || candidates.isEmpty()) {
            return List.of();
        }

        Set<Long> cited = new HashSet<>();
        if (alreadyCited != null) {
            cited.addAll(alreadyCited);
        }

        List<Map<String, Object>> out = new ArrayList<>(limit);
        Set<Long> picked = new HashSet<>();

        if (seedChangeId != null && !cited.contains(seedChangeId)) {
            for (Map<String, Object> c : candidates) {
                Long id = asLong(c.get("id"));
                if (seedChangeId.equals(id)) {
                    out.add(compact(c));
                    picked.add(id);
                    break;
                }
            }
        }

        if (out.size() >= limit) {
            return out;
        }

        Set<String> queryTokens = tokenize(userQuestion);
        boolean overview = isOverviewQuestion(userQuestion);

        List<Scored> scored = new ArrayList<>();
        for (Map<String, Object> c : candidates) {
            Long id = asLong(c.get("id"));
            if (id == null || cited.contains(id) || picked.contains(id)) {
                continue;
            }
            double score = scoreChange(c, queryTokens, overview);
            scored.add(new Scored(score, c));
        }
        scored.sort((a, b) -> Double.compare(b.score, a.score));

        for (Scored s : scored) {
            if (out.size() >= limit) {
                break;
            }
            // Prefer positive overlap; if nothing matched yet, still take best remaining.
            if (s.score <= 0 && !out.isEmpty() && !overview) {
                continue;
            }
            Long id = asLong(s.change.get("id"));
            if (id == null) {
                continue;
            }
            out.add(compact(s.change));
            picked.add(id);
        }

        // Fill remaining slots with highest-tier leftovers
        if (out.size() < limit) {
            for (Map<String, Object> c : candidates) {
                if (out.size() >= limit) {
                    break;
                }
                Long id = asLong(c.get("id"));
                if (id == null || cited.contains(id) || picked.contains(id)) {
                    continue;
                }
                out.add(compact(c));
                picked.add(id);
            }
        }

        return out;
    }

    static double scoreChange(Map<String, Object> change, Set<String> queryTokens, boolean overviewBoost) {
        String blob = ((str(change.get("title")) + " "
                + str(change.get("summary")) + " "
                + str(change.get("why"))).toLowerCase(Locale.ROOT));
        double overlap = 0;
        for (String tok : queryTokens) {
            if (tok.length() < 2) {
                continue;
            }
            if (blob.contains(tok)) {
                overlap += tok.length() >= 4 ? 2.0 : 1.0;
            }
        }
        double tierBoost = switch (str(change.get("tier")).toUpperCase(Locale.ROOT)) {
            case "HIGH" -> 3.0;
            case "MEDIUM" -> 1.5;
            case "LOW" -> 0.5;
            default -> 0.0;
        };
        Number priority = change.get("priority") instanceof Number n ? n : null;
        double p = priority == null ? 0 : Math.min(5, priority.doubleValue() / 20.0);
        Number score = change.get("score") instanceof Number n ? n : null;
        double s = score == null ? 0 : Math.min(3, score.doubleValue() / 30.0);
        double base = overlap * 3 + tierBoost + p + s;
        if (overviewBoost && overlap == 0) {
            base += tierBoost + s;
        }
        return base;
    }

    static boolean isOverviewQuestion(String question) {
        if (question == null || question.isBlank()) {
            return true;
        }
        String q = question.toLowerCase(Locale.ROOT);
        return q.contains("今天") || q.contains("今日") || q.contains("综述") || q.contains("概览")
                || q.contains("最该") || q.contains("值得关注") || q.contains("summary")
                || q.contains("today") || q.contains("overview") || q.contains("what matters")
                || q.contains("top") || q.contains("highlight");
    }

    static Set<String> tokenize(String text) {
        Set<String> out = new HashSet<>();
        if (text == null || text.isBlank()) {
            return out;
        }
        for (String part : TOKEN_SPLIT.split(text.toLowerCase(Locale.ROOT))) {
            if (part == null) {
                continue;
            }
            String t = part.trim();
            if (t.length() >= 2) {
                out.add(t);
            }
        }
        // CJK bigrams for short queries without spaces
        String compact = text.replaceAll("\\s+", "");
        if (compact.codePointCount(0, compact.length()) <= 40) {
            int[] cps = compact.codePoints().toArray();
            for (int i = 0; i + 1 < cps.length; i++) {
                if (Character.UnicodeScript.of(cps[i]) == Character.UnicodeScript.HAN
                        && Character.UnicodeScript.of(cps[i + 1]) == Character.UnicodeScript.HAN) {
                    out.add(new String(cps, i, 2));
                }
            }
        }
        return out;
    }

    public static Map<String, Object> compact(Map<String, Object> change) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", change.get("id"));
        m.put("title", truncate(str(change.get("title")), 160));
        m.put("summary", truncate(str(change.get("summary")), 320));
        m.put("why", truncate(str(change.get("why")), 220));
        m.put("tier", change.get("tier"));
        m.put("recommendation", truncate(str(change.get("recommendation")), 160));
        return m;
    }

    public static String formatNewsPack(List<Map<String, Object>> cards) {
        if (cards == null || cards.isEmpty()) {
            return "(none this turn)";
        }
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> c : cards) {
            sb.append("- id=").append(c.get("id"))
                    .append(" tier=").append(c.get("tier") == null ? "?" : c.get("tier"))
                    .append('\n')
                    .append("  title: ").append(str(c.get("title"))).append('\n')
                    .append("  summary: ").append(str(c.get("summary"))).append('\n');
            if (!str(c.get("why")).isBlank()) {
                sb.append("  why: ").append(str(c.get("why"))).append('\n');
            }
            if (!str(c.get("recommendation")).isBlank()) {
                sb.append("  do: ").append(str(c.get("recommendation"))).append('\n');
            }
        }
        return sb.toString().trim();
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

    private static String str(Object v) {
        return v == null ? "" : v.toString();
    }

    private static String truncate(String text, int max) {
        if (text == null) {
            return "";
        }
        return text.length() <= max ? text : text.substring(0, max) + "…";
    }

    private record Scored(double score, Map<String, Object> change) {
    }
}
