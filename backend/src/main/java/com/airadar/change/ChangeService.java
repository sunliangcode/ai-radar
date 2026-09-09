package com.airadar.change;

import com.airadar.api.ApiTimes;
import com.airadar.event.EventEntity;
import com.airadar.event.EventItemRepository;
import com.airadar.event.EventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChangeService {

    private final EventRepository eventRepository;
    private final EventItemRepository eventItemRepository;

    public ChangeService(EventRepository eventRepository, EventItemRepository eventItemRepository) {
        this.eventRepository = eventRepository;
        this.eventItemRepository = eventItemRepository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listRecent(int limit) {
        return eventRepository.findAll().stream()
                .sorted((a, b) -> b.getLastUpdatedAt().compareTo(a.getLastUpdatedAt()))
                .limit(Math.max(1, limit))
                .map(this::fromEvent)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> fromEvent(EventEntity event) {
        long sources = eventItemRepository.countByEventId(event.getId());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", event.getId());
        m.put("eventId", event.getId());
        m.put("title", event.getTitle());
        m.put("summary", event.getSummary());
        m.put("evidence", event.getImpact());
        m.put("confidence", event.getReliability() == null ? 0.5 : event.getReliability());
        m.put("trend", event.getStatus() == null ? "unknown" : event.getStatus().name());
        m.put("firstDetectedAt", ApiTimes.iso(event.getFirstSeenAt()));
        m.put("lastUpdatedAt", ApiTimes.iso(event.getLastUpdatedAt()));
        m.put("sourceCount", sources);
        m.put("score", event.getScore());
        return m;
    }
}
