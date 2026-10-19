package com.airadar.config;

/**
 * Shared OpenAPI / {@code @Operation} blurbs for SPI catalog endpoints.
 * Keep slash pairs aligned with shared/spi-catalog.mjs {@code BUILTIN_CONNECTOR_PAIRS}
 * / {@code BUILTIN_DELIVERY_SETTINGS} (CI: shared/ops-hint-sync.test.mjs).
 */
public final class SpiCatalogBlurbs {

    private SpiCatalogBlurbs() {
    }

    /** Slash-joined connector id/field pairs (FIXTURE/path + built-ins). */
    public static final String CONNECTOR_EXPECT =
            "FIXTURE/path, RSS/feedUrl, DAILY_HOT/route, WEB/url, TELEGRAM/channels, "
                    + "HACKER_NEWS/query, GOOGLE_NEWS/query, GDELT/query, REDDIT/subreddits, "
                    + "V2EX/nodes, GITHUB/query, TWITTER/users, OSS_INSIGHT/keywords, "
                    + "GITHUB_TRENDING/since, PRODUCT_HUNT/maxItems, EMAIL/maxMessages, "
                    + "ZHIHU/cliPath, WEIBO/cliPath, BILIBILI/cliPath";

    /** Slash-joined delivery id/settingsKey pairs. */
    public static final String DELIVERY_EXPECT =
            "outbox/radar.delivery.outbox-enabled, webhook/WEBHOOK_URL, email/SMTP_HOST, "
                    + "email/SMTP_TO, feishu/FEISHU_WEBHOOK_URL";

    public static final String CONNECTOR_OPERATION_SUMMARY =
            "List connector descriptors sorted by id case-insensitively (id == typeCode; expect "
                    + CONNECTOR_EXPECT
                    + "; field types text/path/secret/textarea)";

    public static final String DELIVERY_OPERATION_SUMMARY =
            "List delivery channels sorted by id case-insensitively (id == channel(); expect "
                    + DELIVERY_EXPECT
                    + ")";
}
