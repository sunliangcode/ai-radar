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
}
