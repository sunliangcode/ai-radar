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

class BilibiliConnectorTest {

    @TempDir
    Path tempDir;

    @Test
    void parsesHotJson() {
        String json = """
                {
                  "ok": true,
                  "schema_version": 1,
                  "data": {
                    "items": [
                      {
                        "bvid": "BV1Yieu6uEUU",
                        "title": "AI 全民制作人",
                        "desc": "demo desc",
                        "pubdate": 1700000000,
                        "owner": { "name": "up" },
                        "stat": { "view": 100, "like": 10 }
                      }
                    ]
                  }
                }
                """;
        BilibiliConnector connector = new BilibiliConnector(new ObjectMapper());
        Source source = new Source(3L, "bili", SourceType.BILIBILI, Map.of(), true, null);
        List<RawItem> items = connector.parseHotJson(json, new FetchContext(Instant.EPOCH, 48, source), 20);
        assertEquals(1, items.size());
        assertEquals("AI 全民制作人", items.getFirst().title());
        assertEquals("https://www.bilibili.com/video/BV1Yieu6uEUU", items.getFirst().url());
        assertEquals("demo desc", items.getFirst().contentSnippet());
    }

    @Test
    void writesCredentialFromCookieHeader() throws Exception {
        String prevHome = System.getProperty("user.home");
        System.setProperty("user.home", tempDir.toString());
        try {
            CliCredentialWriter.writeBilibiliCookie("SESSDATA=tok; bili_jct=jct; DedeUserID=42");
            Path file = tempDir.resolve(".bilibili-cli/credential.json");
            assertTrue(Files.exists(file));
            String body = Files.readString(file);
            assertTrue(body.contains("\"sessdata\""));
            assertTrue(body.contains("tok"));
            assertTrue(body.contains("jct"));
        } finally {
            if (prevHome != null) {
                System.setProperty("user.home", prevHome);
            }
        }
    }
}
