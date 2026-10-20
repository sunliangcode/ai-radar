package com.airadar.api;

import com.airadar.change.EventSourceLookup;
import com.airadar.domain.NewsItem;

import java.util.Set;

/** Shared sourceId matching for list / badge / mark-all filters. */
public final class ItemSourceMatch {

    private ItemSourceMatch() {
    }

    public static boolean matchesAnySourceId(NewsItem item, Set<Long> wanted) {
        if (wanted == null || wanted.isEmpty()) {
            return true;
        }
        if (item == null) {
            return false;
        }
        Long primary = EventSourceLookup.parseSourceId(item.getPrimarySourceId());
        if (primary != null && wanted.contains(primary)) {
            return true;
        }
        if (item.getSourceRefs() != null) {
            for (String ref : item.getSourceRefs()) {
                Long id = EventSourceLookup.parseSourceId(ref);
                if (id != null && wanted.contains(id)) {
                    return true;
                }
            }
        }
        return false;
    }
}
