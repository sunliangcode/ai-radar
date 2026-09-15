package com.airadar.provider.ai;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Remembers the outcome of the last live-LLM call.
 *
 * <p>Without this, a configured-but-broken model degrades silently: every item is scored by
 * heuristics and the only trace is a log line the user never reads. {@code /api/health} and the
 * Settings health card read this to answer "is the AI actually running, and if not, why not?".
 */
@Component
public class AiHealthTracker {

    /** Last failure, kept until the next successful call clears it. */
    public record Failure(String reason, Instant at, String operation) {
    }

    private final AtomicReference<Failure> lastFailure = new AtomicReference<>();
    private final AtomicReference<Instant> lastSuccessAt = new AtomicReference<>();
    private final AtomicLong successCount = new AtomicLong();
    private final AtomicLong failureCount = new AtomicLong();

    public void recordSuccess() {
        successCount.incrementAndGet();
        lastSuccessAt.set(Instant.now());
        lastFailure.set(null);
    }

    public void recordFailure(String operation, String reason) {
        failureCount.incrementAndGet();
        lastFailure.set(new Failure(reason == null || reason.isBlank() ? "unknown error" : reason,
                Instant.now(), operation));
    }

    /** True when no call has failed since the last success (also true before the first call). */
    public boolean isHealthy() {
        return lastFailure.get() == null;
    }

    /**
     * True when the model failed recently enough that retrying every call is pointless.
     *
     * <p>Without this a dead endpoint costs the full retry ladder (attempts × backoff) for every
     * scored batch, which stretched a first fetch to several minutes while buying nothing — the
     * result was heuristics either way. A successful call (or a successful probe) clears it, so
     * recovery is immediate once the model is back.
     */
    public boolean isRecentlyFailing(long cooldownMs) {
        Failure failure = lastFailure.get();
        if (failure == null || cooldownMs <= 0) {
            return false;
        }
        return Instant.now().isBefore(failure.at().plusMillis(cooldownMs));
    }

    public Map<String, Object> toMap() {
        Map<String, Object> out = new LinkedHashMap<>();
        Failure failure = lastFailure.get();
        Instant success = lastSuccessAt.get();
        out.put("ok", isHealthy());
        out.put("successCount", successCount.get());
        out.put("failureCount", failureCount.get());
        out.put("lastSuccessAt", success == null ? null : success.toString());
        out.put("lastError", failure == null ? null : failure.reason());
        out.put("lastErrorAt", failure == null ? null : failure.at().toString());
        out.put("lastErrorOp", failure == null ? null : failure.operation());
        return out;
    }
}
