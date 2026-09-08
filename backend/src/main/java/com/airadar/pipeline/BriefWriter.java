package com.airadar.pipeline;

import com.airadar.delivery.BriefPayload;
import com.airadar.domain.NewsItem;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

public final class BriefWriter {

    private BriefWriter() {
    }

    public static Path write(Path briefsDir, LocalDate date, List<NewsItem> topItems) throws Exception {
        return write(briefsDir, date, topItems, List.of());
    }

    public static Path write(
            Path briefsDir,
            LocalDate date,
            List<NewsItem> topItems,
            List<BriefPayload.BriefEvent> events
    ) throws Exception {
        Files.createDirectories(briefsDir);
        Path file = briefsDir.resolve(date + ".md");
        StringBuilder sb = new StringBuilder();
        sb.append("# AI Radar Brief — ").append(date).append("\n\n");
        sb.append("Generated at ").append(java.time.Instant.now()).append(" (UTC)\n\n");

        if (events != null && !events.isEmpty()) {
            sb.append("## Events\n\n");
            int rank = 1;
            for (BriefPayload.BriefEvent event : events) {
                sb.append("### ").append(rank++).append(". ").append(nullSafe(event.title())).append("\n\n");
                sb.append("- **Score**: ").append(String.format("%.0f", event.score())).append("\n");
                sb.append("- **Status**: ").append(event.status()).append("\n");
                if (event.summary() != null) {
                    sb.append("\n").append(event.summary()).append("\n");
                }
                if (event.impact() != null) {
                    sb.append("\n**Impact:** ").append(event.impact()).append("\n");
                }
                if (event.watchNext() != null) {
                    sb.append("\n**Watch next:** ").append(event.watchNext()).append("\n");
                }
                if (event.evidence() != null && !event.evidence().isEmpty()) {
                    sb.append("\nEvidence:\n");
                    for (BriefPayload.BriefItem ev : event.evidence()) {
                        sb.append("- [").append(nullSafe(ev.title())).append("](").append(ev.url()).append(")\n");
                    }
                }
                sb.append("\n");
            }
        }

        if (topItems == null || topItems.isEmpty()) {
            if (events == null || events.isEmpty()) {
                sb.append("_No items passed the score filter today._\n");
            }
        } else {
            sb.append("## Top Items\n\n");
            int rank = 1;
            for (NewsItem item : topItems) {
                sb.append("### ").append(rank++).append(". ").append(nullSafe(item.getTitle())).append("\n\n");
                sb.append("- **Score**: ").append(item.getScore() == null ? "-" : String.format("%.0f", item.getScore())).append("\n");
                if (item.getCategory() != null) {
                    sb.append("- **Category**: ").append(item.getCategory()).append("\n");
                }
                if (item.getTags() != null && !item.getTags().isEmpty()) {
                    sb.append("- **Tags**: ").append(String.join(", ", item.getTags())).append("\n");
                }
                sb.append("- **URL**: ").append(item.getCanonicalUrl()).append("\n");
                if (item.getPublishedAt() != null) {
                    sb.append("- **Published**: ").append(item.getPublishedAt().atZone(ZoneOffset.UTC)).append("\n");
                }
                sb.append("\n");
                if (item.getSummary() != null && !item.getSummary().isBlank()) {
                    sb.append(item.getSummary()).append("\n\n");
                } else if (item.getScoreReason() != null) {
                    sb.append(item.getScoreReason()).append("\n\n");
                }
            }
        }
        Files.writeString(file, sb.toString());
        return file.toAbsolutePath().normalize();
    }

    private static String nullSafe(String value) {
        return value == null ? "(untitled)" : value;
    }
}
