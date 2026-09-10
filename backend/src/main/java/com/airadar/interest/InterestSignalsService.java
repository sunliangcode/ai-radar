package com.airadar.interest;

import com.airadar.config.RadarProperties;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.preference.PreferenceKeywordEntity;
import com.airadar.preference.PreferenceKeywordRepository;
import com.airadar.preference.PreferenceKeywordService;
import com.airadar.provider.ai.HeuristicAiService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class InterestSignalsService {

    private static final int MAX_KEYWORDS = 40;
    private static final int MIN_LEN = 2;
    private static final int MAX_LEN = 24;
    /** Cache TTL so pipeline batches don't rescan all saved rows on every LLM call. */
    private static final long PROFILE_CACHE_TTL_MS = 90_000L;
    private static final Pattern LATIN_TOKEN = Pattern.compile("[A-Za-z][A-Za-z0-9.+_-]{1,}");

    private final RadarProperties properties;
    private final NewsItemRepository newsItemRepository;
    private final PreferenceKeywordRepository preferenceKeywordRepository;

    private volatile long interestCachedAt;
    private volatile String interestCache;
    private volatile long dislikeCachedAt;
    private volatile String dislikeCache;
    private volatile long keywordsCachedAt;
    private volatile List<String> keywordsCache = List.of();

    public InterestSignalsService(
            RadarProperties properties,
            NewsItemRepository newsItemRepository,
            PreferenceKeywordRepository preferenceKeywordRepository
    ) {
        this.properties = properties;
        this.newsItemRepository = newsItemRepository;
        this.preferenceKeywordRepository = preferenceKeywordRepository;
    }

    /** Drop cached profiles after save/unsave or preference edits. */
    public void invalidate() {
        interestCachedAt = 0L;
        interestCache = null;
        dislikeCachedAt = 0L;
        dislikeCache = null;
        keywordsCachedAt = 0L;
        keywordsCache = List.of();
    }

    public List<String> keywordsFromSaved() {
        long now = System.currentTimeMillis();
        if (keywordsCachedAt > 0L && now - keywordsCachedAt < PROFILE_CACHE_TTL_MS) {
            return keywordsCache;
        }
        List<NewsItemEntity> saved = newsItemRepository.findBySavedTrue();
        Set<String> out = new LinkedHashSet<>();
        for (NewsItemEntity entity : saved) {
            collectFromTitle(entity.getTitle(), out);
            if (out.size() >= MAX_KEYWORDS) {
                break;
            }
        }
        List<String> list = new ArrayList<>(out);
        if (list.size() > MAX_KEYWORDS) {
            list = list.subList(0, MAX_KEYWORDS);
        }
        keywordsCache = List.copyOf(list);
        keywordsCachedAt = now;
        return keywordsCache;
    }

    public String effectiveInterestProfile() {
        long now = System.currentTimeMillis();
        String cached = interestCache;
        if (cached != null && now - interestCachedAt < PROFILE_CACHE_TTL_MS) {
            return cached;
        }
        String base = properties.getInterestProfile();
        if (base == null) {
            base = "";
        }
        String likes = joinedPreference(PreferenceKeywordService.KIND_LIKE, 600);
        List<String> fromSaved = keywordsFromSaved();
        StringBuilder sb = new StringBuilder();
        if (!base.isBlank()) {
            sb.append(base);
        }
        if (!likes.isBlank()) {
            if (!sb.isEmpty()) {
                sb.append("、");
            }
            sb.append(likes);
        }
        if (!fromSaved.isEmpty()) {
            String joined = String.join("、", fromSaved);
            if (!sb.isEmpty()) {
                sb.append("、");
            }
            sb.append(joined);
        }
        String built = sb.toString();
        interestCache = built;
        interestCachedAt = now;
        return built;
    }

    public String effectiveDislikeProfile() {
        long now = System.currentTimeMillis();
        String cached = dislikeCache;
        if (cached != null && now - dislikeCachedAt < PROFILE_CACHE_TTL_MS) {
            return cached;
        }
        String built = joinedPreference(PreferenceKeywordService.KIND_DISLIKE, 600);
        dislikeCache = built;
        dislikeCachedAt = now;
        return built;
    }

    private String joinedPreference(String kind, int maxChars) {
        List<String> texts = preferenceKeywordRepository.findByKindOrderByCreatedAtDesc(kind).stream()
                .map(PreferenceKeywordEntity::getText)
                .toList();
        if (texts.isEmpty()) {
            return "";
        }
        String joined = String.join("、", texts);
        if (joined.length() <= maxChars) {
            return joined;
        }
        return joined.substring(0, maxChars);
    }

    private static void collectFromTitle(String title, Set<String> out) {
        if (title == null || title.isBlank()) {
            return;
        }
        for (String kw : HeuristicAiService.parseInterestKeywords(title)) {
            addKeyword(out, kw);
        }
        Matcher m = LATIN_TOKEN.matcher(title);
        while (m.find()) {
            addKeyword(out, m.group());
        }
    }

    private static void addKeyword(Set<String> out, String raw) {
        if (raw == null) {
            return;
        }
        String t = raw.trim();
        if (t.length() < MIN_LEN || t.length() > MAX_LEN) {
            return;
        }
        if (out.size() >= MAX_KEYWORDS) {
            return;
        }
        boolean exists = out.stream().anyMatch(k -> k.equalsIgnoreCase(t));
        if (!exists) {
            out.add(t);
        }
    }
}
