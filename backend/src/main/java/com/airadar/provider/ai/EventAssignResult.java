package com.airadar.provider.ai;

public record EventAssignResult(
        boolean createNew,
        Long eventId,
        String title,
        double confidence,
        String reason
) {
    public static EventAssignResult create(String title, double confidence, String reason) {
        return new EventAssignResult(true, null, title, confidence, reason);
    }

    public static EventAssignResult assign(Long eventId, String title, double confidence, String reason) {
        return new EventAssignResult(false, eventId, title, confidence, reason);
    }
}
