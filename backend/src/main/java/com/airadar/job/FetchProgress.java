package com.airadar.job;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class FetchProgress {

    public enum Stage {
        idle, fetch, normalize, dedup, score, summarize, persist, cluster, brief, done, error
    }

    public enum SourceStatus {
        pending, running, done, error
    }

    private final Object lock = new Object();
    private volatile boolean running;
    private volatile Stage stage = Stage.idle;
    private volatile Instant startedAt;
    private volatile String error;
    private volatile String message;
    private volatile Map<String, Object> result;
    private final ConcurrentHashMap<Long, SourceState> sources = new ConcurrentHashMap<>();
    private final AtomicReference<List<Long>> sourceOrder = new AtomicReference<>(List.of());

    // Analysis queue (score/summarize/persist per item)
    private volatile int itemsTotal;
    private volatile int itemsDone;
    private volatile int itemsPersisted;
    private volatile String currentItemTitle;
    private volatile Long lastItemId;
    private volatile int callsExpectedPerItem = 2;
    private volatile int aiParallelism = 1;

    /** Mark job as started before sources are known (so UI can show immediately). */
    public void markStarting() {
        synchronized (lock) {
            running = true;
            stage = Stage.fetch;
            startedAt = Instant.now();
            error = null;
            message = null;
            result = null;
            sources.clear();
            sourceOrder.set(List.of());
            resetAnalysisQueue();
        }
    }

    public void begin(List<SourceSeed> seeds) {
        synchronized (lock) {
            running = true;
            stage = Stage.fetch;
            if (startedAt == null) {
                startedAt = Instant.now();
            }
            error = null;
            message = null;
            result = null;
            sources.clear();
            List<Long> order = new ArrayList<>();
            for (SourceSeed seed : seeds) {
                order.add(seed.id());
                sources.put(seed.id(), new SourceState(
                        seed.id(),
                        seed.name(),
                        seed.type(),
                        SourceStatus.pending,
                        null,
                        null,
                        null,
                        null
                ));
            }
            sourceOrder.set(List.copyOf(order));
        }
    }

    public void beginAnalysisQueue(int total, int parallelism, int callsPerItem) {
        synchronized (lock) {
            itemsTotal = Math.max(0, total);
            itemsDone = 0;
            itemsPersisted = 0;
            currentItemTitle = null;
            lastItemId = null;
            aiParallelism = Math.max(1, parallelism);
            callsExpectedPerItem = Math.max(1, callsPerItem);
        }
    }

    public void markItemAnalyzing(String title) {
        currentItemTitle = title;
    }

    public void markItemPersisted(Long itemId, String title) {
        synchronized (lock) {
            itemsDone++;
            itemsPersisted++;
            lastItemId = itemId;
            currentItemTitle = title;
            String verb = stage == Stage.score ? "scoring" : "translating";
            message = verb + " " + itemsDone + "/" + itemsTotal;
        }
    }

    /** Advance analysis queue after a scored (or otherwise completed) item without persist. */
    public void markItemDone(String title) {
        synchronized (lock) {
            itemsDone++;
            currentItemTitle = title;
            String verb = stage == Stage.score ? "scoring" : "translating";
            message = verb + " " + itemsDone + "/" + itemsTotal;
        }
    }

    private void resetAnalysisQueue() {
        itemsTotal = 0;
        itemsDone = 0;
        itemsPersisted = 0;
        currentItemTitle = null;
        lastItemId = null;
        callsExpectedPerItem = 2;
        aiParallelism = 1;
    }

    public void setStage(Stage stage) {
        this.stage = stage;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void markSourceRunning(long sourceId) {
        sources.computeIfPresent(sourceId, (id, prev) -> prev.withStatus(SourceStatus.running, Instant.now(), null, null, null));
    }

    public void markSourceDone(long sourceId, int itemCount, long durationMs) {
        sources.computeIfPresent(sourceId, (id, prev) ->
                prev.withStatus(SourceStatus.done, prev.startedAt(), durationMs, itemCount, null));
    }

    public void markSourceError(long sourceId, String errorMessage, long durationMs) {
        sources.computeIfPresent(sourceId, (id, prev) ->
                prev.withStatus(SourceStatus.error, prev.startedAt(), durationMs, 0, errorMessage));
    }

    public void complete(Map<String, Object> pipelineResult) {
        synchronized (lock) {
            running = false;
            stage = Stage.done;
            error = null;
            result = pipelineResult;
        }
    }

    public void fail(String errorMessage) {
        synchronized (lock) {
            running = false;
            stage = Stage.error;
            error = errorMessage;
        }
    }

    public Map<String, Object> snapshot() {
        Instant start = startedAt;
        long elapsedMs = start == null ? 0 : Math.max(0, Instant.now().toEpochMilli() - start.toEpochMilli());

        List<Map<String, Object>> sourceSnapshots = new ArrayList<>();
        int total = 0;
        int done = 0;
        int runningCount = 0;
        int pending = 0;
        Instant now = Instant.now();

        for (Long id : sourceOrder.get()) {
            SourceState state = sources.get(id);
            if (state == null) {
                continue;
            }
            total++;
            switch (state.status()) {
                case done, error -> done++;
                case running -> runningCount++;
                case pending -> pending++;
            }
            sourceSnapshots.add(state.toMap(now));
        }

        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("total", total);
        totals.put("done", done);
        totals.put("running", runningCount);
        totals.put("remaining", pending + runningCount);

        Map<String, Object> analysis = new LinkedHashMap<>();
        analysis.put("itemsTotal", itemsTotal);
        analysis.put("itemsDone", itemsDone);
        analysis.put("itemsRemaining", Math.max(0, itemsTotal - itemsDone));
        analysis.put("itemsPersisted", itemsPersisted);
        analysis.put("currentItemTitle", currentItemTitle);
        analysis.put("lastItemId", lastItemId);
        analysis.put("callsExpectedPerItem", callsExpectedPerItem);
        analysis.put("aiParallelism", aiParallelism);

        Map<String, Object> snap = new LinkedHashMap<>();
        snap.put("running", running);
        snap.put("stage", stage.name());
        snap.put("startedAt", start == null ? null : start.toString());
        snap.put("elapsedMs", elapsedMs);
        snap.put("error", error);
        snap.put("message", message);
        snap.put("sources", sourceSnapshots);
        snap.put("totals", totals);
        snap.put("analysis", analysis);
        snap.put("result", result);
        return snap;
    }

    public record SourceSeed(long id, String name, String type) {
    }

    private record SourceState(
            long id,
            String name,
            String type,
            SourceStatus status,
            Instant startedAt,
            Long durationMs,
            Integer itemCount,
            String error
    ) {
        SourceState withStatus(SourceStatus next, Instant started, Long duration, Integer items, String err) {
            return new SourceState(id, name, type, next, started, duration, items, err);
        }

        Map<String, Object> toMap(Instant now) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", id);
            map.put("name", name);
            map.put("type", type);
            map.put("status", status.name());
            map.put("startedAt", startedAt == null ? null : startedAt.toString());
            if (status == SourceStatus.running && startedAt != null) {
                map.put("durationMs", Math.max(0, now.toEpochMilli() - startedAt.toEpochMilli()));
            } else {
                map.put("durationMs", durationMs);
            }
            map.put("itemCount", itemCount);
            map.put("error", error);
            return map;
        }
    }
}
