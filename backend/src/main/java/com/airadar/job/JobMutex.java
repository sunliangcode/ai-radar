package com.airadar.job;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Supplier;

@Component
public class JobMutex {

    private final AtomicBoolean fetchRunning = new AtomicBoolean(false);
    private final AtomicBoolean pushRunning = new AtomicBoolean(false);

    public <T> T withFetchLock(Supplier<T> action) {
        return withLock(fetchRunning, "fetch", action);
    }

    public <T> T withPushLock(Supplier<T> action) {
        return withLock(pushRunning, "push", action);
    }

    public boolean tryFetch() {
        return fetchRunning.compareAndSet(false, true);
    }

    public void releaseFetch() {
        fetchRunning.set(false);
    }

    public boolean tryPush() {
        return pushRunning.compareAndSet(false, true);
    }

    public void releasePush() {
        pushRunning.set(false);
    }

    public boolean isFetchRunning() {
        return fetchRunning.get();
    }

    public boolean isPushRunning() {
        return pushRunning.get();
    }

    private <T> T withLock(AtomicBoolean lock, String name, Supplier<T> action) {
        if (!lock.compareAndSet(false, true)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, name + " job already running");
        }
        try {
            return action.get();
        } finally {
            lock.set(false);
        }
    }
}
