package com.airadar.job;

import com.airadar.config.RadarProperties;
import com.airadar.settings.SettingsUpdatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ScheduledFuture;

/**
 * Programmatic fetch / push / cluster schedule.
 *
 * <p>{@code @Scheduled} freezes {@code ${radar.*}} at boot, so saving fetch interval or push cron
 * in Settings used to do nothing until restart. This coordinator re-arms from live
 * {@link RadarProperties} on every settings save and reports the next planned run.
 */
@Component
public class JobScheduleCoordinator {

    private static final Logger log = LoggerFactory.getLogger(JobScheduleCoordinator.class);

    private final TaskScheduler taskScheduler;
    private final RadarJobs radarJobs;
    private final RadarProperties properties;

    private final Object lock = new Object();
    private ScheduledFuture<?> fetchFuture;
    private ScheduledFuture<?> pushFuture;
    private ScheduledFuture<?> clusterFuture;
    private Instant lastFetchDone;
    private Instant lastPushDone;
    private Instant lastClusterDone;
    private Instant nextFetchAt;
    private Instant nextPushAt;
    private Instant nextClusterAt;
    private String pushCronError;
    private boolean started;

    public JobScheduleCoordinator(TaskScheduler taskScheduler, RadarJobs radarJobs, RadarProperties properties) {
        this.taskScheduler = taskScheduler;
        this.radarJobs = radarJobs;
        this.properties = properties;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStart() {
        synchronized (lock) {
            started = true;
        }
        reschedule();
        log.info("job_schedule_ready fetchIntervalMs={} pushCron={} timezone={}",
                properties.getFetchIntervalMs(), properties.getPushCron(), properties.getTimezone());
    }

    @EventListener(SettingsUpdatedEvent.class)
    public void onSettingsUpdated() {
        if (!started) {
            return;
        }
        reschedule();
        log.info("job_schedule_rescheduled fetchIntervalMs={} pushCron={} timezone={}",
                properties.getFetchIntervalMs(), properties.getPushCron(), properties.getTimezone());
    }

    /** Cancel and re-arm every periodic job from the current properties. Safe to call anytime. */
    public void reschedule() {
        synchronized (lock) {
            cancel(fetchFuture);
            cancel(pushFuture);
            cancel(clusterFuture);
            fetchFuture = null;
            pushFuture = null;
            clusterFuture = null;
            pushCronError = null;
            armFetch();
            armPush();
            armCluster();
        }
    }

    public Map<String, Object> snapshot() {
        synchronized (lock) {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("fetchIntervalMs", properties.getFetchIntervalMs());
            out.put("pushCron", properties.getPushCron());
            out.put("timezone", properties.getTimezone());
            out.put("clusterIntervalMs", properties.getClusterIntervalMs());
            out.put("nextFetchAt", iso(nextFetchAt));
            out.put("nextPushAt", iso(nextPushAt));
            out.put("nextClusterAt", iso(nextClusterAt));
            out.put("lastFetchAt", iso(lastFetchDone));
            out.put("lastPushAt", iso(lastPushDone));
            out.put("lastClusterAt", iso(lastClusterDone));
            out.put("pushCronError", pushCronError);
            out.put("running", started);
            return out;
        }
    }

    private void armFetch() {
        long interval = Math.max(30_000L, properties.getFetchIntervalMs());
        Instant when = nextRunAt(lastFetchDone, interval, properties.getFetchInitialDelayMs());
        nextFetchAt = when;
        fetchFuture = taskScheduler.schedule(() -> {
            try {
                radarJobs.scheduledFetch();
            } finally {
                synchronized (lock) {
                    lastFetchDone = Instant.now();
                    armFetch();
                }
            }
        }, when);
    }

    private void armCluster() {
        long interval = Math.max(60_000L, properties.getClusterIntervalMs());
        Instant when = nextRunAt(lastClusterDone, interval, properties.getClusterInitialDelayMs());
        nextClusterAt = when;
        clusterFuture = taskScheduler.schedule(() -> {
            try {
                radarJobs.scheduledCluster();
            } finally {
                synchronized (lock) {
                    lastClusterDone = Instant.now();
                    armCluster();
                }
            }
        }, when);
    }

    private void armPush() {
        String cron = properties.getPushCron();
        String zoneId = properties.getTimezone() != null && !properties.getTimezone().isBlank()
                ? properties.getTimezone()
                : "Asia/Shanghai";
        try {
            CronExpression expression = CronExpression.parse(cron);
            ZonedDateTime next = expression.next(ZonedDateTime.now(ZoneId.of(zoneId)));
            if (next == null) {
                pushCronError = "cron has no next occurrence: " + cron;
                nextPushAt = null;
                log.warn("push_schedule_disabled reason=no_next_occurrence cron={}", cron);
                return;
            }
            nextPushAt = next.toInstant();
            pushFuture = taskScheduler.schedule(() -> {
                try {
                    radarJobs.scheduledPush();
                } finally {
                    synchronized (lock) {
                        lastPushDone = Instant.now();
                        armPush();
                    }
                }
            }, nextPushAt);
        } catch (Exception e) {
            pushCronError = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            nextPushAt = null;
            log.warn("push_schedule_disabled reason=invalid_cron cron={} error={}", cron, pushCronError);
        }
    }

    /**
     * Fixed-delay semantics: wait {@code intervalMs} after the previous completion; on the first
     * arm after boot use {@code initialDelayMs}. Overdue runs fire immediately.
     */
    static Instant nextRunAt(Instant lastDone, long intervalMs, long initialDelayMs) {
        Instant now = Instant.now();
        if (lastDone == null) {
            return now.plus(Duration.ofMillis(Math.max(0L, initialDelayMs)));
        }
        Instant due = lastDone.plusMillis(Math.max(0L, intervalMs));
        return due.isAfter(now) ? due : now;
    }

    private static void cancel(ScheduledFuture<?> future) {
        if (future != null) {
            future.cancel(false);
        }
    }

    private static String iso(Instant instant) {
        return instant == null ? null : instant.truncatedTo(ChronoUnit.SECONDS).toString();
    }
}
