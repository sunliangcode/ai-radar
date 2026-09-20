package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.Source;
import com.airadar.domain.SourceType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WeiboConnectorTest {

    @TempDir
    Path tempDir;

    @Test
    void parsesHotJson() {
        String json = """
                {
                  "ok": 1,
                  "data": {
                    "realtime": [
                      {
                        "word": "人民币升破6.7",
                        "word_scheme": "#人民币升破6.7#",
                        "num": 552719,
                        "rank": 3,
                        "label_name": "热"
                      }
                    ]
                  }
                }
                """;
        WeiboConnector connector = new WeiboConnector(new ObjectMapper());
        Source source = new Source(2L, "weibo", SourceType.WEIBO, Map.of(), true, null);
        List<RawItem> items = connector.parseHotJson(json, new FetchContext(Instant.EPOCH, 48, source), 20);
        assertEquals(1, items.size());
        assertEquals("人民币升破6.7", items.getFirst().title());
        assertTrue(items.getFirst().url().contains("s.weibo.com"));
        assertTrue(items.getFirst().url().contains("%23") || items.getFirst().url().contains("人民币"));
    }

    @Test
    void writesCredentialFromCookieHeader() throws Exception {
        String prevHome = System.getProperty("user.home");
        System.setProperty("user.home", tempDir.toString());
        try {
            CliCredentialWriter.writeWeiboCookie("SUB=abc; SCF=xyz; OTHER=1");
            Path file = tempDir.resolve(".config/weibo-cli/credential.json");
            assertTrue(Files.exists(file));
            String body = Files.readString(file);
            assertTrue(body.contains("\"SUB\""));
            assertTrue(body.contains("abc"));
            assertTrue(body.contains("saved_at"));
        } finally {
            if (prevHome != null) {
                System.setProperty("user.home", prevHome);
            }
        }
    }
}
