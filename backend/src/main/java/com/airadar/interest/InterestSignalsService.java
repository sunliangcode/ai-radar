package com.airadar.interest;

import com.airadar.config.RadarProperties;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
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
    private static final Pattern LATIN_TOKEN = Pattern.compile("[A-Za-z][A-Za-z0-9.+_-]{1,}");

    private final RadarProperties properties;
    private final NewsItemRepository newsItemRepository;

    public InterestSignalsService(RadarProperties properties, NewsItemRepository newsItemRepository) {
        this.properties = properties;
        this.newsItemRepository = newsItemRepository;
    }

    public List<String> keywordsFromSaved() {
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
            return list.subList(0, MAX_KEYWORDS);
        }
        return list;
    }

    public String effectiveInterestProfile() {
        String base = properties.getInterestProfile();
        if (base == null) {
            base = "";
        }
        List<String> fromSaved = keywordsFromSaved();
        if (fromSaved.isEmpty()) {
            return base;
        }
        String joined = String.join("、", fromSaved);
        if (base.isBlank()) {
            return joined;
        }
        return base + "、" + joined;
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
        // Prefer original casing for CJK; Latin kept as-is for display, matching is case-insensitive in scorer.
        if (out.size() >= MAX_KEYWORDS) {
            return;
        }
        boolean exists = out.stream().anyMatch(k -> k.equalsIgnoreCase(t));
        if (!exists) {
            out.add(t);
        }
    }
}
