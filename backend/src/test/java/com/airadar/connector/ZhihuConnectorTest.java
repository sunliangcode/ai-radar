package com.airadar.connector;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ZhihuConnectorTest {

    @Test
    void stripHtmlRemovesTagsAndKeepsText() {
        String out = ZhihuConnector.stripHtml("<p>Hello <b>world</b></p><br/>Next");
        assertTrue(out.contains("Hello"));
        assertTrue(out.contains("world"));
        assertTrue(out.contains("Next"));
        assertTrue(!out.contains("<"));
    }

    @Test
    void parseCommentsTextExtractsAuthorLines() {
        String raw = """
                Some title
                by Alice
                赞 12 · 评论 2

                body text here

                  评论
                1. Bob: first comment
                2. Carol: second comment
                """;
        String comments = ZhihuConnector.parseCommentsText(raw);
        assertEquals("Bob: first comment\nCarol: second comment", comments);
    }

    @Test
    void formatFetchErrorMapsAuthFailuresToLoginHint() {
        assertEquals(
                "Zhihu auth failed — paste Cookie in source config or run `zhihu login`",
                ZhihuConnector.formatFetchError(
                        "zhihu CLI exit 1: authentication failed (401) — run 'zhihu login'"));
        assertEquals(
                "Zhihu auth failed — paste Cookie in source config or run `zhihu login`",
                ZhihuConnector.formatFetchError("ERR_TICKET_NOT_EXIST"));
        assertEquals(
                "Zhihu auth failed — paste Cookie in source config or run `zhihu login`",
                ZhihuConnector.formatFetchError(
                        "unexpected feeds JSON (not array); run `zhihu login` if auth expired"));
    }

    @Test
    void formatFetchErrorKeepsNonAuthDetails() {
        assertEquals(
                "Zhihu feeds failed: zhihu CLI timed out: /bin/zhihu feeds",
                ZhihuConnector.formatFetchError("zhihu CLI timed out: /bin/zhihu feeds"));
        assertEquals("Zhihu feeds failed", ZhihuConnector.formatFetchError(null));
    }
}
