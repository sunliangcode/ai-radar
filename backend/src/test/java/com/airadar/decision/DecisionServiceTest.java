package com.airadar.decision;

import com.airadar.change.EventSourceLookup;
import com.airadar.event.EventRepository;
import com.airadar.event.TimelineEntryRepository;
import com.airadar.memory.MemoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DecisionServiceTest {

    @Mock DecisionRepository decisionRepository;
    @Mock EventRepository eventRepository;
    @Mock TimelineEntryRepository timelineEntryRepository;
    @Mock MemoryService memoryService;
    @Mock EventSourceLookup eventSourceLookup;

    @InjectMocks DecisionService decisionService;

    @Test
    void record_rejectsUnknownKind() {
        when(eventRepository.existsById(1L)).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> decisionService.record(1L, "maybe", null, null));
    }

    @Test
    void record_persistsWatchDecision() {
        when(eventRepository.existsById(2L)).thenReturn(true);
        when(decisionRepository.findByChangeIdOrderByCreatedAtDesc(2L)).thenReturn(List.of());
        when(eventSourceLookup.sourceIdsForEvent(2L)).thenReturn(List.of());

        var result = decisionService.record(2L, "watch", "Java stability", "2026-10-16");

        assertEquals("watch", result.get("kind"));
        verify(decisionRepository).save(any(DecisionEntity.class));
        verify(memoryService).remember(eq("watch"), eq("change"), eq(2L), eq("Java stability"), eq(null));
    }
}
