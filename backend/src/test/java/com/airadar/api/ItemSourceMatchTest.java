package com.airadar.api;

import com.airadar.domain.NewsItem;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ItemSourceMatchTest {

    @Test
    void emptyWantedMatchesAll() {
        NewsItem item = new NewsItem();
        item.setPrimarySourceId("42");
        assertTrue(ItemSourceMatch.matchesAnySourceId(item, Set.of()));
        assertTrue(ItemSourceMatch.matchesAnySourceId(item, null));
    }

    @Test
    void matchesPrimarySourceId() {
        NewsItem item = new NewsItem();
        item.setPrimarySourceId("7");
        assertTrue(ItemSourceMatch.matchesAnySourceId(item, Set.of(7L)));
        assertFalse(ItemSourceMatch.matchesAnySourceId(item, Set.of(8L)));
    }

    @Test
    void matchesSourceRefs() {
        NewsItem item = new NewsItem();
        item.setPrimarySourceId("1");
        Set<String> refs = new LinkedHashSet<>();
        refs.add("9");
        refs.add("10");
        item.setSourceRefs(refs);
        assertTrue(ItemSourceMatch.matchesAnySourceId(item, Set.of(9L)));
        assertFalse(ItemSourceMatch.matchesAnySourceId(item, Set.of(11L)));
    }
}
