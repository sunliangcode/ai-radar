package com.airadar.job;

import com.airadar.delivery.DeliveryService;
import com.airadar.event.EventClusterService;
import com.airadar.impact.ImpactService;
import com.airadar.maintenance.RetentionService;
import com.airadar.pipeline.PipelineOrchestrator;
import com.airadar.pipeline.PipelineRequest;
import com.airadar.pipeline.PipelineResult;
import com.airadar.settings.SettingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Job entry points. Periodic triggers live in {@link JobScheduleCoordinator} so Settings can
 * re-arm fetch / push / cluster without a restart ({@code @Scheduled} freezes ${radar.*} at boot).
 */
@Component
public class RadarJobs {

    private static final Logger log = LoggerFactory.getLogger(RadarJobs.class);

    private final PipelineOrchestrator orchestrator;
    private final DeliveryService deliveryService;
    private final JobMutex jobMutex;
    private final SettingsService settingsService;
    private final EventClusterService eventClusterService;
    private final ImpactService impactService;
    private final FetchProgress fetchProgress;
    private final RetentionService retentionService;
    private final AtomicBoolean clusterRunning = new AtomicBoolean(false);
    private final AtomicBoolean impactRunning = new AtomicBoolean(false);

    public RadarJobs(
            PipelineOrchestrator orchestrator,
            DeliveryService deliveryService,
            JobMutex jobMutex,
            SettingsService settingsService,
            EventClusterService eventClusterService,
            ImpactService impactService,
            FetchProgress fetchProgress,
            RetentionService retentionService
    ) {
        this.orchestrator = orchestrator;
        this.deliveryService = deliveryService;
        this.jobMutex = jobMutex;
        this.settingsService = settingsService;
        this.eventClusterService = eventClusterService;
        this.impactService = impactService;
        this.fetchProgress = fetchProgress;
        this.retentionService = retentionService;
    }

    public void scheduledFetch() {
        if (!jobMutex.tryFetch()) {
            log.info("fetch_skipped reason=already_running");
            return;
        }
        try {
            log.info("scheduled_fetch_start");
            PipelineResult result = runPipelineWithProgress();
            log.info("scheduled_fetch_done kept={} durationMs={}", result.kept(), result.durationMs());
        } catch (Exception e) {
            log.error("scheduled_fetch_failed error={}", e.getMessage());
        } finally {
            jobMutex.releaseFetch();
        }
        try {
            retentionService.run();
        } catch (Exception e) {
            log.warn("retention_after_fetch_failed error={}", e.getMessage());
        }
    }

    public void scheduledPush() {
        if (!jobMutex.tryPush()) {
            log.info("push_skipped reason=already_running");
            return;
        }
        try {
            log.info("scheduled_push_start");
            Map<String, Object> result = deliveryService.pushToday();
            log.info("scheduled_push_done result={}", result);
        } catch (Exception e) {
            log.error("scheduled_push_failed error={}", e.getMessage());
        } finally {
            jobMutex.releasePush();
        }
    }

    public void scheduledCluster() {
        if (jobMutex.isFetchRunning()) {
            log.info("cluster_skipped reason=fetch_running");
            return;
        }
        if (!clusterRunning.compareAndSet(false, true)) {
            log.info("cluster_skipped reason=already_running");
            return;
        }
        try {
            log.info("scheduled_cluster_start");
            int hours = settingsService.effective().lookbackHours() != null
                    ? settingsService.effective().lookbackHours()
                    : 48;
            Map<String, Object> result = eventClusterService.linkUnattachedItems(hours);
            log.info("scheduled_cluster_done result={}", result);
        } catch (Exception e) {
            log.error("scheduled_cluster_failed error={}", e.getMessage());
        } finally {
            clusterRunning.set(false);
        }
    }

    public PipelineResult runFetch() {
        return runFetch(null);
    }

    public PipelineResult runFetch(String sourceType) {
        return jobMutex.withFetchLock(() -> runPipelineWithProgress(sourceType));
    }

    public Map<String, Object> fetchProgressSnapshot() {
        return fetchProgress.snapshot();
    }

    private PipelineResult runPipelineWithProgress() {
        return runPipelineWithProgress(null);
    }

    private PipelineResult runPipelineWithProgress(String sourceType) {
        fetchProgress.markStarting();
        try {
            PipelineResult result = orchestrator.run(new PipelineRequest(null, null, null, sourceType));
            fetchProgress.complete(toResultMap(result));
            return result;
        } catch (Exception e) {
            fetchProgress.fail(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            throw e;
        }
    }

    private static Map<String, Object> toResultMap(PipelineResult result) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("fetched", result.fetched());
        map.put("deduped", result.deduped());
        map.put("scored", result.scored());
        map.put("kept", result.kept());
        map.put("briefPath", result.briefPath());
        map.put("durationMs", result.durationMs());
        return map;
    }

    public Map<String, Object> runPush() {
        return jobMutex.withPushLock(deliveryService::pushToday);
    }

    public Map<String, Object> runCluster() {
        if (jobMutex.isFetchRunning()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "fetch job already running");
        }
        if (!clusterRunning.compareAndSet(false, true)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "cluster job already running");
        }
        try {
            int hours = settingsService.effective().lookbackHours() != null
                    ? settingsService.effective().lookbackHours()
                    : 72;
            return eventClusterService.linkUnattachedItems(Math.max(hours, 72));
        } finally {
            clusterRunning.set(false);
        }
    }

    public Map<String, Object> runImpact() {
        if (jobMutex.isFetchRunning()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "fetch job already running");
        }
        if (!impactRunning.compareAndSet(false, true)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "impact job already running");
        }
        try {
            return impactService.recomputeAll();
        } finally {
            impactRunning.set(false);
        }
    }
}
