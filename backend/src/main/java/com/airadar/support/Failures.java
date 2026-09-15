package com.airadar.support;

import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;

/** Turns thrown values into short, actionable descriptions for logs, APIs and the UI. */
public final class Failures {

    private static final int MAX_MESSAGE_CHARS = 240;

    private Failures() {
    }

    /**
     * Build a readable one-liner for a failure, walking the cause chain.
     *
     * <p>Many Spring/JDK network exceptions carry a {@code null} message (a {@code ConnectException}
     * nested in a {@code ResourceAccessException}, for instance). Naive {@code getMessage()} logging
     * then produces the useless {@code "AI call failed: null"}, so the exception type is always
     * included and the chain is preserved.
     */
    public static String describe(Throwable e) {
        if (e == null) {
            return "unknown error";
        }
        StringBuilder sb = new StringBuilder();
        Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        for (Throwable t = e; t != null && seen.add(t); t = t.getCause()) {
            if (sb.length() > 0) {
                sb.append(" <- ");
            }
            sb.append(t.getClass().getSimpleName());
            String msg = t.getMessage();
            if (msg != null && !msg.isBlank()) {
                sb.append(": ").append(truncate(msg.replaceAll("\\s+", " ").trim()));
            }
            if (t.getCause() == t) {
                break;
            }
        }
        return sb.toString();
    }

    private static String truncate(String text) {
        return text.length() <= MAX_MESSAGE_CHARS ? text : text.substring(0, MAX_MESSAGE_CHARS) + "…";
    }
}
