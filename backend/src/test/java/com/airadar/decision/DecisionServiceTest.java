package com.airadar.decision;

import com.airadar.change.EventSourceLookup;
import com.airadar.event.EventRepository;
import com.airadar.event.TimelineEntryRepository;
import com.airadar.memory.MemoryService;
import com.airadar.watch.WatchSubscriptionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DecisionServiceTest {

    @Mock DecisionRepository decisionRepository;
    @Mock EventRepository eventRepository;
    @Mock TimelineEntryRepository timelineEntryRepository;
    @Mock MemoryService memoryService;
    @Mock EventSourceLookup eventSourceLookup;
    @Mock WatchSubscriptionService watchSubscriptionService;

    @InjectMocks DecisionService decisionService;

    @Test
    void record_rejectsUnknownKind() {
        when(eventRepository.existsById(1L)).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> decisionService.record(1L, "maybe", null, null));
    }

    @Test
    void record_persistsWatchDecisionAndFollows() {
        when(eventRepository.existsById(2L)).thenReturn(true);
        when(decisionRepository.findByChangeIdOrderByCreatedAtDesc(2L)).thenReturn(List.of());
        when(eventSourceLookup.sourceIdsForEvent(2L)).thenReturn(List.of());
        when(watchSubscriptionService.upsertForChange(eq(2L), any())).thenReturn(Map.of("changeId", 2L));

        var result = decisionService.record(2L, "watch", "Java stability", "2026-10-16");

        assertEquals("watch", result.get("kind"));
        verify(decisionRepository).save(any(DecisionEntity.class));
        verify(watchSubscriptionService).upsertForChange(eq(2L), eq(Map.of()));
    }

    @Test
    void record_investigateDoesNotFollow() {
        when(eventRepository.existsById(4L)).thenReturn(true);
        when(decisionRepository.findByChangeIdOrderByCreatedAtDesc(4L)).thenReturn(List.of());
        when(eventSourceLookup.sourceIdsForEvent(4L)).thenReturn(List.of());

        var result = decisionService.record(4L, "investigate", "dig deeper", null);

        assertEquals("investigate", result.get("kind"));
        verify(watchSubscriptionService, never()).upsertForChange(any(), any());
        verify(watchSubscriptionService, never()).removeIfPresent(any());
    }

    @Test
    void record_ignoreUnfollows() {
        when(eventRepository.existsById(5L)).thenReturn(true);
        when(decisionRepository.findByChangeIdOrderByCreatedAtDesc(5L)).thenReturn(List.of());
        when(eventSourceLookup.sourceIdsForEvent(5L)).thenReturn(List.of());
        when(watchSubscriptionService.removeIfPresent(5L)).thenReturn(true);

        var result = decisionService.record(5L, "ignore", "noise", null);

        assertEquals("ignore", result.get("kind"));
        verify(watchSubscriptionService).removeIfPresent(5L);
        verify(watchSubscriptionService, never()).upsertForChange(any(), any());
    }

    @Test
    void openChangeIds_collectsOpenDecisions() {
        DecisionEntity open = new DecisionEntity();
        open.setChangeId(3L);
        open.setStatus("open");
        when(decisionRepository.findByStatusOrderByUpdatedAtDesc("open")).thenReturn(List.of(open));

        var ids = decisionService.openChangeIds();

        assertEquals(1, ids.size());
        assertEquals(true, ids.contains(3L));
    }

    @Test
    void snooze_pushesRevisitForward() {
        DecisionEntity open = new DecisionEntity();
        open.setId(9L);
        open.setChangeId(2L);
        open.setKind("watch");
        open.setStatus("open");
        open.setRevisitAt(Instant.parse("2020-01-01T00:00:00Z"));
        when(decisionRepository.findById(9L)).thenReturn(Optional.of(open));
        when(eventSourceLookup.sourceIdsForEvent(2L)).thenReturn(List.of());

        var result = decisionService.snooze(9L, 7);

        assertNotNull(result.get("revisitAt"));
        verify(decisionRepository).save(open);
    }

    @Test
    void snooze_restoresAbsoluteRevisit() {
        DecisionEntity open = new DecisionEntity();
        open.setId(10L);
        open.setChangeId(2L);
        open.setKind("watch");
        open.setStatus("open");
        open.setRevisitAt(Instant.parse("2030-01-01T00:00:00Z"));
        when(decisionRepository.findById(10L)).thenReturn(Optional.of(open));
        when(eventSourceLookup.sourceIdsForEvent(2L)).thenReturn(List.of());

        var result = decisionService.snooze(10L, 7, "2020-06-15T00:00:00Z");

        assertEquals("2020-06-15T00:00:00Z", result.get("revisitAt"));
        verify(decisionRepository).save(open);
    }
}
