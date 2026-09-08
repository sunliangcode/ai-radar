package com.airadar.job;

import com.airadar.delivery.DeliveryService;
import com.airadar.event.EventClusterService;
import com.airadar.pipeline.PipelineOrchestrator;
import com.airadar.pipeline.PipelineRequest;
import com.airadar.pipeline.PipelineResult;
import com.airadar.settings.SettingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class RadarJobs {

    private static final Logger log = LoggerFactory.getLogger(RadarJobs.class);

    private final PipelineOrchestrator orchestrator;
    private final DeliveryService deliveryService;
    private final JobMutex jobMutex;
    private final SettingsService settingsService;
    private final EventClusterService eventClusterService;
    private final AtomicBoolean clusterRunning = new AtomicBoolean(false);

    public RadarJobs(
            PipelineOrchestrator orchestrator,
            DeliveryService deliveryService,
            JobMutex jobMutex,
            SettingsService settingsService,
            EventClusterService eventClusterService
    ) {
        this.orchestrator = orchestrator;
        this.deliveryService = deliveryService;
        this.jobMutex = jobMutex;
        this.settingsService = settingsService;
        this.eventClusterService = eventClusterService;
    }

    @Scheduled(fixedDelayString = "${radar.fetch-interval-ms:7200000}", initialDelayString = "${radar.fetch-initial-delay-ms:60000}")
    public void scheduledFetch() {
        if (!jobMutex.tryFetch()) {
            log.info("fetch_skipped reason=already_running");
            return;
        }
        try {
            log.info("scheduled_fetch_start");
            PipelineResult result = orchestrator.run(new PipelineRequest(null, null, null));
            log.info("scheduled_fetch_done kept={} durationMs={}", result.kept(), result.durationMs());
        } catch (Exception e) {
            log.error("scheduled_fetch_failed error={}", e.getMessage());
        } finally {
            jobMutex.releaseFetch();
        }
    }

    @Scheduled(cron = "${radar.push-cron:0 0 8 * * *}", zone = "${radar.timezone:Asia/Shanghai}")
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

    @Scheduled(fixedDelayString = "${radar.cluster-interval-ms:3600000}", initialDelayString = "120000")
    public void scheduledCluster() {
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
        return jobMutex.withFetchLock(() -> orchestrator.run(new PipelineRequest(null, null, null)));
    }

    public Map<String, Object> runPush() {
        return jobMutex.withPushLock(deliveryService::pushToday);
    }

    public Map<String, Object> runCluster() {
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
}
