package com.airadar.feedback;

import com.airadar.action.ActionEntity;
import com.airadar.action.ActionRepository;
import com.airadar.action.ActionService;
import com.airadar.context.ContextService;
import com.airadar.event.EventEntity;
import com.airadar.event.EventRepository;
import com.airadar.memory.MemoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    @Mock MemoryService memoryService;
    @Mock ActionService actionService;
    @Mock ActionRepository actionRepository;
    @Mock EventRepository eventRepository;
    @Mock ContextService contextService;

    FeedbackService feedbackService;

    @BeforeEach
    void setUp() {
        feedbackService = new FeedbackService(
                memoryService, actionService, actionRepository, eventRepository, contextService);
    }

    @Test
    void changeFeedback_writesMemory() {
        EventEntity event = new EventEntity();
        event.setId(9L);
        event.setTitle("Model pricing drop");
        when(eventRepository.findById(9L)).thenReturn(Optional.of(event));

        Map<String, Object> out = feedbackService.submit("change", 9L, "useful");

        assertEquals("change", out.get("targetType"));
        assertEquals(9L, out.get("targetId"));
        assertEquals("useful", out.get("kind"));
        verify(memoryService).remember(eq("useful"), eq("change"), eq(9L), eq("Model pricing drop"), any());
    }

    @Test
    void actionFeedback_syncsStatus() {
        ActionEntity action = org.mockito.Mockito.mock(ActionEntity.class);
        when(action.getTitle()).thenReturn("Run benchmark");
        when(actionRepository.findById(3L)).thenReturn(Optional.of(action));
        when(actionService.patch(eq(3L), any())).thenReturn(Map.of("id", 3L, "status", "watching"));

        feedbackService.submit("action", 3L, "watch");

        verify(memoryService).remember(eq("watch"), eq("action"), eq(3L), eq("Run benchmark"), any());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> body = ArgumentCaptor.forClass(Map.class);
        verify(actionService).patch(eq(3L), body.capture());
        assertEquals("watching", body.getValue().get("status"));
    }

    @Test
    void invalidKind_rejected() {
        assertThrows(IllegalArgumentException.class, () -> feedbackService.submit("change", 1L, "nope"));
    }

    @Test
    void withdraw_change_forgetsMemoryAndRevertsTopic() {
        EventEntity event = new EventEntity();
        event.setId(9L);
        event.setTitle("Model pricing drop");
        when(eventRepository.findById(9L)).thenReturn(Optional.of(event));
        when(memoryService.forget("useful", "change", 9L)).thenReturn(1);

        Map<String, Object> out = feedbackService.withdraw("change", 9L, "useful", null);

        assertEquals(true, out.get("withdrawn"));
        assertEquals(1, out.get("forgotten"));
        verify(memoryService).forget("useful", "change", 9L);
        verify(contextService).revertTopicFeedback("Model pricing drop", true);
        verify(actionService, never()).patch(any(), any());
    }

    @Test
    void withdraw_action_restoresStatusAndForgets() {
        when(memoryService.forget("watch", "action", 3L)).thenReturn(1);
        when(actionService.patch(eq(3L), any())).thenReturn(Map.of("id", 3L, "status", "open"));

        Map<String, Object> out = feedbackService.withdraw("action", 3L, "watch", "open");

        assertEquals(true, out.get("withdrawn"));
        verify(memoryService).forget("watch", "action", 3L);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> body = ArgumentCaptor.forClass(Map.class);
        verify(actionService).patch(eq(3L), body.capture());
        assertEquals("open", body.getValue().get("status"));
        assertEquals("open", ((Map<?, ?>) out.get("action")).get("status"));
    }
}
