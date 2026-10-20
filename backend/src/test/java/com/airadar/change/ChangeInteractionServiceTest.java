package com.airadar.change;

import com.airadar.event.EventEntity;
import com.airadar.event.EventRepository;
import com.airadar.memory.MemoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChangeInteractionServiceTest {

    @Mock EventRepository eventRepository;
    @Mock MemoryService memoryService;
    @InjectMocks ChangeInteractionService service;

    @Test
    void dismiss_remembersDismissed() {
        EventEntity event = new EventEntity();
        event.setId(3L);
        event.setTitle("T");
        when(eventRepository.findById(3L)).thenReturn(Optional.of(event));

        var out = service.dismiss(3L);

        assertEquals(true, out.get("dismissed"));
        verify(memoryService).remember(eq("dismissed"), eq("change"), eq(3L), eq("T"), eq("{\"days\":7}"));
    }

    @Test
    void undismiss_forgetsDismissedRows() {
        when(eventRepository.existsById(3L)).thenReturn(true);
        when(memoryService.forget("dismissed", "change", 3L)).thenReturn(2);

        var out = service.undismiss(3L);

        assertFalse(Boolean.TRUE.equals(out.get("dismissed")));
        assertEquals(2, out.get("removed"));
        verify(memoryService).forget("dismissed", "change", 3L);
    }
}
