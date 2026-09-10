package com.airadar.preference;

import com.airadar.api.ApiTimes;
import com.airadar.interest.InterestSignalsService;
import com.airadar.persistence.NewsItemEntity;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.provider.ai.AiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ExecutorService;

@Service
public class PreferenceKeywordService {

    private static final Logger log = LoggerFactory.getLogger(PreferenceKeywordService.class);
    private static final int MAX_TEXT = 200;

    public static final String KIND_LIKE = "like";
    public static final String KIND_DISLIKE = "dislike";
    public static final String SOURCE_MANUAL = "manual";
    public static final String SOURCE_AI_SAVE = "ai_save";
    public static final String SOURCE_AI_DISMISS = "ai_dismiss";

    private final PreferenceKeywordRepository repository;
    private final NewsItemRepository newsItemRepository;
    private final AiService aiService;
    private final ExecutorService fetchExecutor;
    private final InterestSignalsService interestSignals;

    public PreferenceKeywordService(
            PreferenceKeywordRepository repository,
            NewsItemRepository newsItemRepository,
            @Lazy AiService aiService,
            ExecutorService fetchExecutor,
            @Lazy InterestSignalsService interestSignals
    ) {
        this.repository = repository;
        this.newsItemRepository = newsItemRepository;
        this.aiService = aiService;
        this.fetchExecutor = fetchExecutor;
        this.interestSignals = interestSignals;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(String kind) {
        List<PreferenceKeywordEntity> rows;
        if (kind != null && !kind.isBlank()) {
            rows = repository.findByKindOrderByCreatedAtDesc(normalizeKind(kind));
        } else {
            rows = repository.findAllByOrderByCreatedAtDesc();
        }
        return rows.stream().map(this::toDto).toList();
    }

    @Transactional
    public Map<String, Object> add(String kind, String text, String source, Long itemId) {
        String k = normalizeKind(kind);
        String t = normalizeText(text);
        if (t.isBlank()) {
            throw new IllegalArgumentException("text required");
        }
        if (repository.existsByKindAndTextIgnoreCase(k, t)) {
            return repository.findByKindOrderByCreatedAtDesc(k).stream()
                    .filter(e -> e.getText().equalsIgnoreCase(t))
                    .findFirst()
                    .map(this::toDto)
                    .orElseThrow();
        }
        PreferenceKeywordEntity entity = new PreferenceKeywordEntity();
        entity.setKind(k);
        entity.setText(t);
        entity.setSource(source == null || source.isBlank() ? SOURCE_MANUAL : source);
        entity.setItemId(itemId);
        Map<String, Object> dto = toDto(repository.save(entity));
        interestSignals.invalidate();
        return dto;
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("keyword not found: " + id);
        }
        repository.deleteById(id);
        interestSignals.invalidate();
    }

    public List<String> textsForKind(String kind) {
        return repository.findByKindOrderByCreatedAtDesc(normalizeKind(kind)).stream()
                .map(PreferenceKeywordEntity::getText)
                .toList();
    }

    public String joinedProfile(String kind, int maxChars) {
        List<String> texts = textsForKind(kind);
        if (texts.isEmpty()) {
            return "";
        }
        String joined = String.join("、", texts);
        if (joined.length() <= maxChars) {
            return joined;
        }
        return joined.substring(0, maxChars);
    }

    public void extractAsync(Long itemId, String kind, String source) {
        if (itemId == null) {
            return;
        }
        fetchExecutor.execute(() -> {
            try {
                extractAndStore(itemId, kind, source);
            } catch (Exception e) {
                log.warn("preference_keyword_extract_failed itemId={} kind={} error={}", itemId, kind, e.getMessage());
            }
        });
    }

    /** Load → LLM outside TX → short persist via {@link #add}. */
    public void extractAndStore(Long itemId, String kind, String source) {
        NewsItemEntity entity = newsItemRepository.findById(itemId).orElse(null);
        if (entity == null) {
            return;
        }
        String title = entity.getTitle();
        String body = entity.getSummary() != null ? entity.getSummary() : entity.getContentSnippet();

        String text = aiService.extractPreferenceKeyword(title, body, kind);
        if (text == null || text.isBlank()) {
            text = heuristicKeyword(title);
        }
        if (text == null || text.isBlank()) {
            return;
        }
        add(kind, text, source, itemId);
    }

    private static String heuristicKeyword(String title) {
        if (title == null || title.isBlank()) {
            return null;
        }
        String trimmed = title.trim();
        if (trimmed.length() <= MAX_TEXT) {
            return trimmed;
        }
        return trimmed.substring(0, MAX_TEXT);
    }

    private static String normalizeKind(String kind) {
        String k = kind == null ? "" : kind.trim().toLowerCase(Locale.ROOT);
        if (!KIND_LIKE.equals(k) && !KIND_DISLIKE.equals(k)) {
            throw new IllegalArgumentException("kind must be like or dislike");
        }
        return k;
    }

    private static String normalizeText(String text) {
        if (text == null) {
            return "";
        }
        String t = text.trim().replaceAll("\\s+", " ");
        if (t.length() > MAX_TEXT) {
            t = t.substring(0, MAX_TEXT);
        }
        return t;
    }

    private Map<String, Object> toDto(PreferenceKeywordEntity e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("kind", e.getKind());
        m.put("text", e.getText());
        m.put("source", e.getSource());
        m.put("itemId", e.getItemId());
        m.put("createdAt", ApiTimes.iso(e.getCreatedAt()));
        return m;
    }
}
