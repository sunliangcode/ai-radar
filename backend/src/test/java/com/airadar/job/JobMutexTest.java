package com.airadar.job;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JobMutexTest {

    @Test
    void fetchFlagBlocksOverlappingFetch() {
        JobMutex mutex = new JobMutex();
        assertTrue(mutex.tryFetch());
        assertTrue(mutex.isFetchRunning());
        assertFalse(mutex.tryFetch());
        mutex.releaseFetch();
        assertFalse(mutex.isFetchRunning());
        assertTrue(mutex.tryFetch());
        mutex.releaseFetch();
    }
}
