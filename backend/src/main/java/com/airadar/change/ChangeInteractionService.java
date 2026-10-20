package com.airadar.change;

import com.airadar.event.EventEntity;
import com.airadar.event.EventRepository;
import com.airadar.memory.MemoryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class ChangeInteractionService {

    private final EventRepository eventRepository;
    private final MemoryService memoryService;

    public ChangeInteractionService(EventRepository eventRepository, MemoryService memoryService) {
        this.eventRepository = eventRepository;
        this.memoryService = memoryService;
    }

    @Transactional
    public Map<String, Object> dismiss(Long changeId) {
        EventEntity event = eventRepository.findById(changeId)
                .orElseThrow(() -> new NoSuchElementException("change not found: " + changeId));
        memoryService.remember("dismissed", "change", changeId, event.getTitle(),
                "{\"days\":7}");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("changeId", changeId);
        out.put("dismissed", true);
        return out;
    }

    /** Undo dismiss so the change can re-enter Today major triage. */
    @Transactional
    public Map<String, Object> undismiss(Long changeId) {
        if (!eventRepository.existsById(changeId)) {
            throw new NoSuchElementException("change not found: " + changeId);
        }
        int removed = memoryService.forget("dismissed", "change", changeId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("changeId", changeId);
        out.put("dismissed", false);
        out.put("removed", removed);
        return out;
    }
}
