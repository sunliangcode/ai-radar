package com.airadar.connector;

import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.Source;
import com.airadar.domain.SourceType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RssConnectorTest {

    @TempDir
    Path tempDir;

    @Test
    void parsesLocalAtomFeed() throws Exception {
        Path feed = tempDir.resolve("feed.xml");
        Files.writeString(feed, Files.readString(Path.of("src/test/resources/fixtures/sample-atom.xml")));
        String feedUrl = feed.toUri().toString();

        RssConnector connector = new RssConnector();
        Source source = new Source(4L, "rss", SourceType.RSS, Map.of("feedUrl", feedUrl), true, null);
        FetchContext ctx = new FetchContext(Instant.EPOCH, 48, source);
        List<RawItem> items = connector.fetch(ctx);
        assertEquals(1, items.size());
        assertEquals("Atom Item One", items.getFirst().title());
        assertTrue(items.getFirst().contentSnippet().contains("Hello"));
    }

    @Test
    void stripHtmlRemovesTags() {
        assertEquals("Hello world", RssConnector.stripHtml("<p>Hello <b>world</b></p>"));
    }
}
