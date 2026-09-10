package com.airadar.provider.ai;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiCallGateTest {

    @Test
    void serializesConcurrentCallers() throws Exception {
        AiCallGate gate = new AiCallGate();
        AtomicInteger inFlight = new AtomicInteger();
        AtomicInteger maxInFlight = new AtomicInteger();
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Runnable task = () -> {
                try {
                    start.await(2, TimeUnit.SECONDS);
                    gate.run(() -> {
                        int n = inFlight.incrementAndGet();
                        maxInFlight.updateAndGet(m -> Math.max(m, n));
                        try {
                            Thread.sleep(80);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        } finally {
                            inFlight.decrementAndGet();
                        }
                    });
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            };
            pool.execute(task);
            pool.execute(task);
            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS));
            assertEquals(1, maxInFlight.get());
            assertEquals(1, gate.availablePermits());
        } finally {
            pool.shutdownNow();
        }
    }
}
