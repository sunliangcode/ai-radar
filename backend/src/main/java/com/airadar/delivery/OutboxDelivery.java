package com.airadar.delivery;

import com.airadar.config.RadarProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class OutboxDelivery implements DeliveryChannel {

    private static final Logger log = LoggerFactory.getLogger(OutboxDelivery.class);

    private final RadarProperties properties;
    private final ObjectMapper objectMapper;

    public OutboxDelivery(RadarProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public String channel() {
        return "outbox";
    }

    @Override
    public boolean isEnabled() {
        return properties.getDelivery().isOutboxEnabled();
    }

    @Override
    public DeliveryDescriptor descriptor() {
        return DeliveryDescriptor.of("outbox", "Local Outbox", List.of("radar.delivery.outbox-enabled"));
    }

    @Override
    public DeliveryResult deliver(BriefPayload payload) {
        long started = System.currentTimeMillis();
        if (!isEnabled()) {
            return DeliveryResult.skipped(channel(), "disabled");
        }
        try {
            Path dir = Path.of("./data/outbox");
            Files.createDirectories(dir);
            String name = payload.date().format(DateTimeFormatter.ISO_LOCAL_DATE)
                    + "-" + System.currentTimeMillis() + ".json";
            Path file = dir.resolve(name);
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(), payload);
            long ms = System.currentTimeMillis() - started;
            int count = payload.events() != null && !payload.events().isEmpty()
                    ? payload.events().size()
                    : payload.items().size();
            log.info("delivery channel=outbox success=true file={} items={} durationMs={}", file, count, ms);
            return DeliveryResult.ok(channel(), count, ms);
        } catch (Exception e) {
            long ms = System.currentTimeMillis() - started;
            log.error("delivery channel=outbox success=false error={}", e.getMessage());
            return DeliveryResult.fail(channel(), 0, ms, e.getMessage());
        }
    }
}
