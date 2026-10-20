package com.airadar.api;

import com.airadar.domain.NewsItem;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ItemListCursorTest {

    @Test
    void roundTripEncodeDecode() {
        ItemListCursor c = new ItemListCursor(false, 88.5, 42L);
        ItemListCursor back = ItemListCursor.decode(c.encode()).orElseThrow();
        assertFalse(back.isRead());
        assertEquals(88.5, back.getScore());
        assertEquals(42L, back.getId());
    }

    @Test
    void isBeforeFollowsUnreadThenScoreThenId() {
        ItemListCursor cursor = new ItemListCursor(false, 80.0, 100L);

        NewsItem sameUnreadLowerScore = item(false, 70.0, 99L);
        assertTrue(cursor.isBefore(sameUnreadLowerScore));

        NewsItem unreadHigherScore = item(false, 90.0, 50L);
        assertFalse(cursor.isBefore(unreadHigherScore));

        NewsItem readItem = item(true, 99.0, 1L);
        assertTrue(cursor.isBefore(readItem));
    }

    private static NewsItem item(boolean read, double score, long id) {
        NewsItem n = new NewsItem();
        n.setId(id);
        n.setRead(read);
        n.setScore(score);
        return n;
    }
}
