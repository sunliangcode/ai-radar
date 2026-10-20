package com.airadar.connector;

/**
 * Outcome of a CLI smoke probe used by Sources setup UI.
 */
public record ProbeResult(String state, String reason) {

    public static final String OK = "ok";
    public static final String NEED_COOKIE = "need_cookie";
    public static final String CLI_MISSING = "cli_missing";
    public static final String FAILED = "failed";

    public static ProbeResult ok() {
        return new ProbeResult(OK, "");
    }

    public static ProbeResult needCookie(String reason) {
        return new ProbeResult(NEED_COOKIE, reason == null ? "" : reason);
    }

    public static ProbeResult cliMissing(String reason) {
        return new ProbeResult(CLI_MISSING, reason == null ? "" : reason);
    }

    public static ProbeResult failed(String reason) {
        return new ProbeResult(FAILED, reason == null ? "" : reason);
    }

    /** Map CLI stderr / exception text → need_cookie vs failed. */
    public static ProbeResult fromCliFailure(String detail) {
        String d = detail == null ? "" : detail.trim();
        String lower = d.toLowerCase();
        if (lower.contains("not_authenticated")
                || lower.contains("authentication failed")
                || lower.contains("未登录")
                || lower.contains("need login")
                || lower.contains("需要登录")
                || lower.contains("err_ticket")
                || lower.contains("zhihu login")
                || (lower.contains("cookie") && (lower.contains("auth") || lower.contains("fail") || lower.contains("invalid")))
                || lower.contains("401")) {
            return needCookie(d.isBlank() ? "Cookie required or expired" : d);
        }
        if (lower.contains("no such file")
                || lower.contains("cannot run program")
                || lower.contains("error=2")
                || lower.contains("not found")) {
            return cliMissing(d.isBlank() ? "CLI binary not found" : d);
        }
        return failed(d.isBlank() ? "CLI probe failed" : d);
    }
}
