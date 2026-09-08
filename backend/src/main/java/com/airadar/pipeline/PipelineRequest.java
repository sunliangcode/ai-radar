package com.airadar.pipeline;

public record PipelineRequest(
        Integer lookbackHours,
        Integer maxItems,
        Integer scoreThreshold
) {
}
