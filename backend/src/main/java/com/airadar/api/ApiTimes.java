package com.airadar.api;

import java.time.Instant;

public final class ApiTimes {

    private ApiTimes() {
    }

    public static String iso(Instant instant) {
        return instant == null ? null : instant.toString();
    }
}
