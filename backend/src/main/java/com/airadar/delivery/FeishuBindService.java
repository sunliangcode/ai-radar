package com.airadar.delivery;

import com.airadar.settings.SettingsService;
import com.lark.oapi.scene.registration.RegisterApp;
import com.lark.oapi.scene.registration.RegisterAppException;
import com.lark.oapi.scene.registration.RegisterAppOptions;
import com.lark.oapi.scene.registration.RegisterAppResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Feishu scan-to-bind via Device Authorization Grant (RegisterApp).
 * Single-user: one in-memory session map with TTL cleanup.
 */
@Service
public class FeishuBindService {

    private static final Logger log = LoggerFactory.getLogger(FeishuBindService.class);
    private static final long SESSION_TTL_MS = TimeUnit.MINUTES.toMillis(10);

    private final SettingsService settingsService;
    private final FeishuOpenApiClient openApiClient;
    private final ExecutorService executor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "feishu-bind");
        t.setDaemon(true);
        return t;
    });
    private final ConcurrentHashMap<String, BindSession> sessions = new ConcurrentHashMap<>();

    public FeishuBindService(SettingsService settingsService, FeishuOpenApiClient openApiClient) {
        this.settingsService = settingsService;
        this.openApiClient = openApiClient;
    }

    public Map<String, Object> start() {
        prune();
        String sessionId = UUID.randomUUID().toString();
        BindSession session = new BindSession(sessionId);
        sessions.put(sessionId, session);

        executor.execute(() -> runRegister(session));

        // Wait briefly for QR URL so the first response can include it
        long deadline = System.currentTimeMillis() + 8_000;
        while (session.qrUrl.get() == null
                && "pending".equals(session.status.get())
                && System.currentTimeMillis() < deadline) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        return status(sessionId);
    }

    public Map<String, Object> status(String sessionId) {
        prune();
        BindSession session = sessions.get(sessionId);
        if (session == null) {
            return Map.of("sessionId", sessionId, "status", "expired");
        }
        return session.toMap();
    }

    public void unbind() {
        settingsService.clearFeishuBind();
    }

    private void runRegister(BindSession session) {
        try {
            // oapi-sdk RegisterApp (Device Authorization Grant): scan creates app + returns open_id.
            RegisterAppResult result = RegisterApp.register(
                    RegisterAppOptions.newBuilder()
                            .source("ai-radar")
                            .onQRCode(info -> {
                                session.qrUrl.set(info.getUrl());
                                session.expiresIn.set(info.getExpireIn());
                                session.status.set("waiting_scan");
                            })
                            .onStatusChange(info -> {
                                if (info.getStatus() != null) {
                                    log.debug("feishu bind poll status={}", info.getStatus());
                                }
                            })
                            .build()
            );

            String appId = result.getClientId();
            String appSecret = result.getClientSecret();
            String openId = result.getUserInfo() != null ? result.getUserInfo().getOpenId() : null;
            if (appId == null || appId.isBlank() || appSecret == null || appSecret.isBlank()) {
                session.status.set("failed");
                session.error.set("missing_credentials");
                return;
            }
            if (openId == null || openId.isBlank()) {
                session.status.set("failed");
                session.error.set("missing_open_id");
                return;
            }

            settingsService.saveFeishuBind(appId, appSecret, openId);
            session.status.set("bound");

            try {
                String token = openApiClient.tenantAccessToken(appId, appSecret);
                openApiClient.sendText(token, openId,
                        "已绑定 AI Radar。每日简报会推送到这里；可在设置里一键解除。");
            } catch (Exception welcomeEx) {
                log.warn("feishu welcome after bind failed: {}", welcomeEx.getMessage());
                session.welcomeHint.set(true);
            }
        } catch (RegisterAppException e) {
            log.info("feishu bind ended code={} desc={}", e.getCode(), e.getDescription());
            session.status.set("failed");
            session.error.set(e.getCode() != null ? e.getCode() : "register_failed");
        } catch (Exception e) {
            log.error("feishu bind failed: {}", e.getMessage());
            session.status.set("failed");
            session.error.set(e.getMessage() == null ? "register_failed" : e.getMessage());
        }
    }

    private void prune() {
        long now = System.currentTimeMillis();
        sessions.entrySet().removeIf(e -> now - e.getValue().createdAt.toEpochMilli() > SESSION_TTL_MS);
    }

    static final class BindSession {
        final String id;
        final Instant createdAt = Instant.now();
        final AtomicReference<String> status = new AtomicReference<>("pending");
        final AtomicReference<String> qrUrl = new AtomicReference<>();
        final AtomicReference<Integer> expiresIn = new AtomicReference<>();
        final AtomicReference<String> error = new AtomicReference<>();
        final AtomicReference<Boolean> welcomeHint = new AtomicReference<>(false);

        BindSession(String id) {
            this.id = id;
        }

        Map<String, Object> toMap() {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("sessionId", id);
            m.put("status", status.get());
            if (qrUrl.get() != null) {
                m.put("qrUrl", qrUrl.get());
            }
            if (expiresIn.get() != null) {
                m.put("expiresIn", expiresIn.get());
            }
            if (error.get() != null) {
                m.put("error", error.get());
            }
            if (Boolean.TRUE.equals(welcomeHint.get())) {
                m.put("welcomeHint", true);
            }
            return m;
        }
    }
}
