package com.airadar.delivery;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record BriefPayload(
        LocalDate date,
        Instant generatedAt,
        List<BriefItem> items,
        List<BriefEvent> events,
        String uiUrl
) {
    public BriefPayload(LocalDate date, Instant generatedAt, List<BriefItem> items, String uiUrl) {
        this(date, generatedAt, items, List.of(), uiUrl);
    }

    public record BriefItem(String title, double score, String summary, String url) {
    }

    public record BriefEvent(
            Long id,
            String title,
            double score,
            String status,
            String summary,
            String impact,
            String watchNext,
            List<BriefItem> evidence
    ) {
    }
}
