package com.airadar.api;

import com.airadar.event.EventEntity;
import com.airadar.event.EventRepository;
import com.airadar.event.TimelineEntryEntity;
import com.airadar.event.TimelineEntryRepository;
import com.airadar.memory.MemoryEntity;
import com.airadar.memory.MemoryRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Aggregates everything the user has explicitly "watch"-ed into a single timeline.
 * Each watched change contributes its newest timeline entries, so the UI can show
 * "what moved on the topics you track" without clicking into each one.
 */
@RestController
@RequestMapping("/api/watching")
public class WatchingController {

    private final MemoryRepository memoryRepository;
    private final EventRepository eventRepository;
    private final TimelineEntryRepository timelineRepository;

    public WatchingController(
            MemoryRepository memoryRepository,
            EventRepository eventRepository,
            TimelineEntryRepository timelineRepository
    ) {
        this.memoryRepository = memoryRepository;
        this.eventRepository = eventRepository;
        this.timelineRepository = timelineRepository;
    }

    @GetMapping("/timeline")
    public Map<String, Object> timeline() {
        List<MemoryEntity> watched = memoryRepository.findByKindAndRefType("watch", "change");
        List<Map<String, Object>> groups = watched.stream()
                .map(m -> eventRepository.findById(m.getRefId()).orElse(null))
                .filter(e -> e != null)
                .distinct()
                .map(this::toGroup)
                .sorted(Comparator.comparingInt((Map<String, Object> g) -> ((List<?>) g.get("entries")).size()).reversed())
                .toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("groups", groups);
        out.put("count", groups.size());
        return out;
    }

    private Map<String, Object> toGroup(EventEntity event) {
        List<TimelineEntryEntity> entries =
                timelineRepository.findByEventIdOrderByAtAsc(event.getId());
        List<Map<String, Object>> recent = entries.reversed().stream().limit(10).map(e -> {
            Map<String, Object> m = new LinkedHashMap<String, Object>();
            m.put("id", e.getId());
            m.put("at", ApiTimes.iso(e.getAt()));
            m.put("label", e.getLabel());
            m.put("note", e.getNote());
            return m;
        }).toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("eventId", event.getId());
        out.put("title", event.getTitle());
        out.put("status", event.getStatus());
        out.put("entryCount", entries.size());
        out.put("entries", recent);
        return out;
    }
}
