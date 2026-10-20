package com.airadar.connector;

import com.airadar.domain.SourceType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Keeps the CLI Install wizard scoped to OSS CLI connectors only.
 * Adding {@link CliSetupSupport} to another connector is intentional — update this set.
 */
class CliSetupSupportAuditTest {

    private static final Set<SourceType> EXPECTED_SETUP = EnumSet.of(
            SourceType.ZHIHU,
            SourceType.WEIBO,
            SourceType.BILIBILI
    );

    @Test
    void onlyOssCliConnectorsImplementSetupSupport() {
        ObjectMapper mapper = new ObjectMapper();
        List<SourceConnector> setupConnectors = List.of(
                new BilibiliConnector(mapper),
                new WeiboConnector(mapper),
                new ZhihuConnector(mapper)
        );
        Set<SourceType> withSetup = EnumSet.noneOf(SourceType.class);
        for (SourceConnector c : setupConnectors) {
            assertTrue(c instanceof CliSetupSupport, c.type() + " must implement CliSetupSupport");
            CliSetupSupport support = (CliSetupSupport) c;
            withSetup.add(c.type());
            assertTrue(support.setupRecipe().repoUrl().startsWith("https://github.com/"));
            assertFalse(support.setupRecipe().pypiPackage().isBlank());
            assertFalse(support.setupRecipe().binaryName().isBlank());
        }
        assertEquals(EXPECTED_SETUP, withSetup);

        // Spot-check non-CLI connectors stay out of the wizard SPI.
        assertFalse(CliSetupSupport.class.isAssignableFrom(RssConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(DailyHotConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(TwitterConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(HackerNewsConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(GithubConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(WebConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(EmailConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(ProductHuntConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(TelegramConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(FixtureConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(RedditConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(V2exConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(GoogleNewsConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(GdeltConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(OssInsightConnector.class));
        assertFalse(CliSetupSupport.class.isAssignableFrom(GithubTrendingConnector.class));
    }
}
