package com.airadar.provider.ai;

public record SummarizeResult(String summary, String titleDisplay) {

    public static SummarizeResult of(String summary) {
        return new SummarizeResult(summary == null ? "" : summary, null);
    }
}
