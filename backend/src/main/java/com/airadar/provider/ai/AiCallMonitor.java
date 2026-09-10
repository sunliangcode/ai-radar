package com.airadar.provider.ai;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * In-memory ring buffer of recent LLM calls for the Settings monitor UI.
 * Supports multiple concurrent in-flight calls (aiParallelism &gt; 1) and SSE deltas.
 */
@Service
public class AiCallMonitor {

    private static final int CAPACITY = 50;
    public static final int PREVIEW_MAX_CHARS = 4000;

    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    private final AiCallRecord[] buffer = new AiCallRecord[CAPACITY];
    private int writeIndex = 0;
    private int size = 0;
    private long callCount = 0;
    private long errorCount = 0;
    private final Map<String, InFlightCall> inFlights = new ConcurrentHashMap<>();
    private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    // Pipeline queue mirror (fed by FetchProgress / orchestrator via setQueue)
    private volatile Map<String, Object> queueSnapshot = Map.of();

    public String begin(String operation, String model, String prompt, int contextWindow) {
        String id = UUID.randomUUID().toString();
        InFlightCall call = new InFlightCall(
                id,
                operation,
                model,
                Instant.now(),
                preview(prompt),
                contextWindow
        );
        inFlights.put(id, call);
        emit("begin", call.toMap());
        return id;
    }

    public void appendDelta(String callId, String chunk) {
        if (callId == null || chunk == null || chunk.isEmpty()) {
            return;
        }
        InFlightCall call = inFlights.get(callId);
        if (call == null) {
            return;
        }
        call.append(chunk);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", callId);
        payload.put("operation", call.operation());
        payload.put("delta", chunk);
        payload.put("responseSoFar", call.responseSoFar());
        emit("delta", payload);
    }

    public void clearInFlight(String callId) {
        if (callId != null) {
            inFlights.remove(callId);
        }
    }

    public void complete(String callId, AiCallRecord record) {
        if (callId != null) {
            inFlights.remove(callId);
        }
        lock.writeLock().lock();
        try {
            buffer[writeIndex] = record;
            writeIndex = (writeIndex + 1) % CAPACITY;
            if (size < CAPACITY) {
                size++;
            }
            callCount++;
            if (!record.ok()) {
                errorCount++;
            }
        } finally {
            lock.writeLock().unlock();
        }
        Map<String, Object> payload = new LinkedHashMap<>(record.toMap());
        if (callId != null) {
            payload.put("id", callId);
        }
        emit("complete", payload);
    }

    /** @deprecated use begin/complete */
    public void record(AiCallRecord record) {
        complete(null, record);
    }

    public void setQueue(Map<String, Object> queue) {
        if (queue == null) {
            this.queueSnapshot = Map.of();
        } else {
            // LinkedHashMap allows null values (itemsTotal fields may be unset).
            Map<String, Object> copy = new LinkedHashMap<>();
            for (Map.Entry<String, Object> e : queue.entrySet()) {
                if (e.getKey() != null) {
                    copy.put(e.getKey(), e.getValue());
                }
            }
            this.queueSnapshot = copy;
        }
        emit("queue", this.queueSnapshot);
    }

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        try {
            emitter.send(SseEmitter.event().name("snapshot").data(snapshot()));
        } catch (IOException e) {
            emitters.remove(emitter);
            emitter.completeWithError(e);
        }
        return emitter;
    }

    private void emit(String event, Object data) {
        if (emitters.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(event).data(data));
            } catch (Exception e) {
                emitters.remove(emitter);
                try {
                    emitter.complete();
                } catch (Exception ignored) {
                    // ignore
                }
            }
        }
    }

    public Map<String, Object> snapshot() {
        lock.readLock().lock();
        try {
            List<AiCallRecord> recent = recentUnlocked();
            List<InFlightCall> flights = new ArrayList<>(inFlights.values());
            flights.sort((a, b) -> a.startedAt().compareTo(b.startedAt()));

            Map<String, Object> out = new LinkedHashMap<>();
            out.put("callCount", callCount);
            out.put("errorCount", errorCount);
            Integer contextWindow = null;
            if (!recent.isEmpty()) {
                contextWindow = recent.getFirst().contextWindow();
            } else if (!flights.isEmpty()) {
                contextWindow = flights.getFirst().contextWindow();
            }
            out.put("contextWindow", contextWindow);

            Double lastTps = null;
            Double avgTps = null;
            Integer lastContextUsed = null;
            Integer lastContextWindow = null;
            Double lastContextUsedPct = null;
            Long lastLatencyMs = null;

            List<Double> tpsSamples = new ArrayList<>();
            for (AiCallRecord r : recent) {
                if (r.ok() && r.tokensPerSec() != null && r.tokensPerSec() > 0) {
                    tpsSamples.add(r.tokensPerSec());
                }
            }
            if (!tpsSamples.isEmpty()) {
                lastTps = tpsSamples.getFirst();
                avgTps = tpsSamples.stream().mapToDouble(Double::doubleValue).average().orElse(0);
            }
            if (!recent.isEmpty()) {
                AiCallRecord last = recent.getFirst();
                lastContextUsed = last.promptTokens() + last.completionTokens();
                lastContextWindow = last.contextWindow();
                lastContextUsedPct = last.contextUsedPct();
                lastLatencyMs = last.latencyMs();
            }

            out.put("lastTokensPerSec", lastTps);
            out.put("avgTokensPerSec", avgTps);
            out.put("lastContextUsed", lastContextUsed);
            out.put("lastContextWindow", lastContextWindow);
            out.put("lastContextUsedPct", lastContextUsedPct);
            out.put("lastLatencyMs", lastLatencyMs);
            out.put("inFlights", flights.stream().map(InFlightCall::toMap).toList());
            out.put("inFlight", flights.isEmpty() ? null : flights.getFirst().toMap());
            out.put("recent", recent.stream().map(AiCallRecord::toMap).toList());
            out.put("queue", queueSnapshot);
            out.put("streaming", true);
            return out;
        } finally {
            lock.readLock().unlock();
        }
    }

    private List<AiCallRecord> recentUnlocked() {
        List<AiCallRecord> list = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            int idx = (writeIndex - 1 - i + CAPACITY) % CAPACITY;
            list.add(buffer[idx]);
        }
        return list;
    }

    public static String preview(String text) {
        if (text == null) {
            return "";
        }
        if (text.length() <= PREVIEW_MAX_CHARS) {
            return text;
        }
        return text.substring(0, PREVIEW_MAX_CHARS) + "…";
    }

    public static final class InFlightCall {
        private final String id;
        private final String operation;
        private final String model;
        private final Instant startedAt;
        private final String promptPreview;
        private final int contextWindow;
        private final StringBuilder responseSoFar = new StringBuilder();

        public InFlightCall(
                String id,
                String operation,
                String model,
                Instant startedAt,
                String promptPreview,
                int contextWindow
        ) {
            this.id = id;
            this.operation = operation;
            this.model = model;
            this.startedAt = startedAt;
            this.promptPreview = promptPreview;
            this.contextWindow = contextWindow;
        }

        public String id() { return id; }
        public String operation() { return operation; }
        public String model() { return model; }
        public Instant startedAt() { return startedAt; }
        public String promptPreview() { return promptPreview; }
        public int contextWindow() { return contextWindow; }

        public synchronized void append(String chunk) {
            responseSoFar.append(chunk);
            if (responseSoFar.length() > PREVIEW_MAX_CHARS * 2) {
                responseSoFar.delete(0, responseSoFar.length() - PREVIEW_MAX_CHARS);
            }
        }

        public synchronized String responseSoFar() {
            return responseSoFar.toString();
        }

        public Map<String, Object> toMap() {
            long elapsedMs = Math.max(0, Instant.now().toEpochMilli() - startedAt.toEpochMilli());
            String soFar = responseSoFar();
            double progressPct;
            if (!soFar.isEmpty()) {
                progressPct = Math.min(95.0, 20.0 + soFar.length() / 20.0);
            } else {
                progressPct = Math.min(90.0, 90.0 * (1.0 - Math.exp(-elapsedMs / 15_000.0)));
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", id);
            m.put("operation", operation);
            m.put("model", model);
            m.put("startedAt", startedAt.toString());
            m.put("elapsedMs", elapsedMs);
            m.put("progressPct", progressPct);
            m.put("promptPreview", promptPreview);
            m.put("responseSoFar", soFar);
            m.put("contextWindow", contextWindow);
            return m;
        }
    }

    public record AiCallRecord(
            Instant ts,
            String operation,
            String model,
            int promptTokens,
            int completionTokens,
            int contextWindow,
            double contextUsedPct,
            long latencyMs,
            Double tokensPerSec,
            boolean truncated,
            boolean ok,
            String error,
            String promptPreview,
            String responsePreview
    ) {
        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ts", ts.toString());
            m.put("operation", operation);
            m.put("model", model);
            m.put("promptTokens", promptTokens);
            m.put("completionTokens", completionTokens);
            m.put("contextWindow", contextWindow);
            m.put("contextUsedPct", contextUsedPct);
            m.put("latencyMs", latencyMs);
            m.put("tokensPerSec", tokensPerSec);
            m.put("truncated", truncated);
            m.put("ok", ok);
            m.put("error", error);
            m.put("promptPreview", promptPreview);
            m.put("responsePreview", responsePreview);
            return m;
        }

        public static AiCallRecord success(
                String operation,
                String model,
                int promptTokens,
                int completionTokens,
                int contextWindow,
                long latencyMs,
                boolean truncated,
                String prompt,
                String response
        ) {
            return success(operation, model, promptTokens, completionTokens, contextWindow, latencyMs, truncated,
                    prompt, response, null);
        }

        public static AiCallRecord success(
                String operation,
                String model,
                int promptTokens,
                int completionTokens,
                int contextWindow,
                long latencyMs,
                boolean truncated,
                String prompt,
                String response,
                Long decodeMs
        ) {
            int used = promptTokens + completionTokens;
            double pct = contextWindow > 0 ? (used * 100.0 / contextWindow) : 0;
            // Prefer decode-only TPS when streaming measured first→last token; fall back to total latency.
            long tpsWindowMs = decodeMs != null && decodeMs > 0 ? decodeMs : latencyMs;
            Double tps = tpsWindowMs > 0 ? (completionTokens * 1000.0 / tpsWindowMs) : null;
            return new AiCallRecord(
                    Instant.now(), operation, model,
                    promptTokens, completionTokens, contextWindow, pct,
                    latencyMs, tps, truncated, true, null,
                    preview(prompt), preview(response)
            );
        }

        public static AiCallRecord failure(
                String operation,
                String model,
                int promptTokens,
                int contextWindow,
                long latencyMs,
                boolean truncated,
                String error,
                String prompt
        ) {
            double pct = contextWindow > 0 ? (promptTokens * 100.0 / contextWindow) : 0;
            return new AiCallRecord(
                    Instant.now(), operation, model,
                    promptTokens, 0, contextWindow, pct,
                    latencyMs, null, truncated, false,
                    error == null ? "error" : (error.length() > 200 ? error.substring(0, 200) : error),
                    preview(prompt), null
            );
        }
    }
}
