package com.airadar.provider.ai;

import org.springframework.stereotype.Component;

import java.util.concurrent.Semaphore;
import java.util.function.Supplier;

/**
 * Process-wide gate so only one LLM HTTP call is in flight at a time.
 * Local models (e.g. Ollama) are effectively single-threaded; callers may still
 * schedule AI work from many threads ({@code fetchExecutor}, HTTP, jobs).
 */
@Component
public class AiCallGate {

    private final Semaphore semaphore = new Semaphore(1, true);

    public <T> T call(Supplier<T> action) {
        semaphore.acquireUninterruptibly();
        try {
            return action.get();
        } finally {
            semaphore.release();
        }
    }

    public void run(Runnable action) {
        call(() -> {
            action.run();
            return null;
        });
    }

    /** Visible for tests: how many permits are currently available (0 or 1). */
    int availablePermits() {
        return semaphore.availablePermits();
    }
}
