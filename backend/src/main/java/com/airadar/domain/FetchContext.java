package com.airadar.domain;

import java.time.Instant;

public record FetchContext(
        Instant since,
        int lookbackHours,
        Source source
) {
}
