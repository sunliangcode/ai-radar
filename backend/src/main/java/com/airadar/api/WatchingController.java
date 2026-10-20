package com.airadar.api;

import com.airadar.change.EventSourceLookup;
import com.airadar.event.EventEntity;
import com.airadar.event.EventRepository;
import com.airadar.event.TimelineEntryEntity;
import com.airadar.event.TimelineEntryRepository;
import com.airadar.watch.WatchSubscriptionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Aggregates everything the user has explicitly followed into a single timeline.
 * Source of truth is {@link WatchSubscriptionService} (same as Follow / Unfollow),
 * not memory audit rows — so unfollow cannot leave ghost timeline groups.
 */
@RestController
@RequestMapping("/api/watching")
public class WatchingController {

    private final WatchSubscriptionService watchSubscriptionService;
    private final EventRepository eventRepository;
    private final TimelineEntryRepository timelineRepository;
    private final EventSourceLookup eventSourceLookup;

    public WatchingController(
            WatchSubscriptionService watchSubscriptionService,
            EventRepository eventRepository,
            TimelineEntryRepository timelineRepository,
            EventSourceLookup eventSourceLookup
    ) {
        this.watchSubscriptionService = watchSubscriptionService;
        this.eventRepository = eventRepository;
        this.timelineRepository = timelineRepository;
        this.eventSourceLookup = eventSourceLookup;
    }

    @GetMapping("/timeline")
    public Map<String, Object> timeline() {
        List<Map<String, Object>> groups = watchSubscriptionService.listAll().stream()
                .map(sub -> {
                    Object id = sub.get("changeId");
                    if (!(id instanceof Number n)) {
                        return null;
                    }
                    return eventRepository.findById(n.longValue()).orElse(null);
                })
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
        out.put("sourceIds", eventSourceLookup.sourceIdsForEvent(event.getId()));
        out.put("entries", recent);
        return out;
    }
}
