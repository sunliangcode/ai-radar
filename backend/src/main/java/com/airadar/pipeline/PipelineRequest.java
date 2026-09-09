package com.airadar.pipeline;

public record PipelineRequest(
        Integer lookbackHours,
        Integer maxItems,
        Integer scoreThreshold,
        String sourceType
) {
    public PipelineRequest(Integer lookbackHours, Integer maxItems, Integer scoreThreshold) {
        this(lookbackHours, maxItems, scoreThreshold, null);
    }
}
