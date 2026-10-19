package com.airadar.support;

import org.junit.jupiter.api.Test;

import java.net.ConnectException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FailuresTest {

    @Test
    void alwaysNamesTheExceptionEvenWhenMessagesAreNull() {
        // The real-world case that used to log "AI call failed: null": the wrapper has a message,
        // the root ConnectException does not — so the type name must appear.
        Throwable nested = new RuntimeException(
                "I/O error on POST request for \"http://localhost:11434/v1/chat/completions\"",
                new ConnectException());
        String described = Failures.describe(nested);

        assertTrue(described.contains("RuntimeException"), described);
        assertTrue(described.contains("ConnectException"), described);
        assertTrue(described.contains("<-"), "should show the cause chain: " + described);
    }

    @Test
    void handlesNullAndMessageLessExceptions() {
        assertEquals("unknown error", Failures.describe(null));
        assertEquals("IllegalStateException", Failures.describe(new IllegalStateException()));
    }

    @Test
    void truncatesHugeUpstreamBodies() {
        String described = Failures.describe(new IllegalStateException("x".repeat(5000)));
        assertTrue(described.length() < 400, "should be truncated, was " + described.length());
    }

    @Test
    void collapsesWhitespaceInMessages() {
        String described = Failures.describe(new IllegalStateException("line1\n\t  line2"));
        assertTrue(described.contains("line1 line2"), described);
        assertEquals(false, described.contains("\n"));
    }

    @Test
    void stopsOnSelfReferentialCause() {
        // JDK forbids initCause(this); override getCause to exercise the defensive branch.
        Throwable e = new RuntimeException("loop") {
            @Override
            public synchronized Throwable getCause() {
                return this;
            }
        };
        String described = Failures.describe(e);
        assertTrue(described.contains("loop"), described);
        assertEquals(false, described.contains("<-"), described);
    }
}
