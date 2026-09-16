package com.airadar.change;

import com.airadar.event.EventItemEntity;
import com.airadar.event.EventItemRepository;
import com.airadar.persistence.NewsItemRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Resolves news-source ids linked to an event/change for UI filtering. */
@Service
public class EventSourceLookup {

    private static final Pattern DIGITS = Pattern.compile("(\\d+)");

    private final EventItemRepository eventItemRepository;
    private final NewsItemRepository newsItemRepository;

    public EventSourceLookup(EventItemRepository eventItemRepository, NewsItemRepository newsItemRepository) {
        this.eventItemRepository = eventItemRepository;
        this.newsItemRepository = newsItemRepository;
    }

    public List<Long> sourceIdsForEvent(Long eventId) {
        if (eventId == null) {
            return List.of();
        }
        Set<Long> ids = new LinkedHashSet<>();
        for (EventItemEntity link : eventItemRepository.findByEventId(eventId)) {
            newsItemRepository.findById(link.getNewsItemId()).ifPresent(e -> {
                Long sid = parseSourceId(e.getPrimarySourceId());
                if (sid != null) {
                    ids.add(sid);
                }
            });
        }
        return new ArrayList<>(ids);
    }

    public static Long parseSourceId(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        Matcher m = DIGITS.matcher(raw);
        if (!m.find()) {
            return null;
        }
        try {
            return Long.parseLong(m.group(1));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
