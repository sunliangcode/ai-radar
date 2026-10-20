package com.airadar.connector;

/**
 * Typed failure for CLI setup install/probe so the SPA can localize and act.
 */
public class SetupException extends RuntimeException {

    private final String code;
    private final int httpStatus;

    public SetupException(String code, String message) {
        this(code, message, 400);
    }

    public SetupException(String code, String message, int httpStatus) {
        super(message == null ? code : message);
        this.code = code == null || code.isBlank() ? "setup_failed" : code;
        this.httpStatus = httpStatus;
    }

    public String code() {
        return code;
    }

    public int httpStatus() {
        return httpStatus;
    }

    public static SetupException unsupported() {
        return new SetupException("setup_unsupported", "source type does not support CLI setup");
    }

    public static SetupException conflict(String message) {
        return new SetupException("setup_busy", message, 409);
    }

    public static SetupException classifyInstall(String detail) {
        String d = detail == null ? "" : detail;
        String lower = d.toLowerCase();
        if (lower.contains("git clone") || (lower.contains("git") && lower.contains("not found"))) {
            return new SetupException("setup_git_missing",
                    d.isBlank() ? "git is required to clone the CLI" : d);
        }
        if (lower.contains("uv ") && lower.contains("127")
                || lower.contains("pipx") && lower.contains("127")
                || lower.contains("python3") && lower.contains("127")
                || lower.contains("no such file") && (lower.contains("uv") || lower.contains("pipx") || lower.contains("python"))) {
            return new SetupException("setup_toolchain_missing",
                    d.isBlank() ? "Install uv, pipx, or Python 3, then retry" : d);
        }
        return new SetupException("setup_install_failed", d.isBlank() ? "CLI install failed" : d);
    }
}
