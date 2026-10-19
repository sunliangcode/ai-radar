package com.airadar.api;

import com.airadar.config.SpiCatalogBlurbs;
import com.airadar.delivery.DeliveryChannel;
import com.airadar.delivery.DeliveryChannelIndex;
import com.airadar.delivery.DeliveryDescriptor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/delivery/channels")
@Tag(name = "Delivery", description = "Delivery channel SPI catalog")
public class DeliveryChannelsController {

    private final List<DeliveryChannel> channels;

    public DeliveryChannelsController(List<DeliveryChannel> channels) {
        DeliveryChannelIndex.requireUnique(channels);
        this.channels = channels;
    }

    @GetMapping
    @Operation(summary = SpiCatalogBlurbs.DELIVERY_OPERATION_SUMMARY)
    public List<DeliveryChannelView> list() {
        return channels.stream()
                .sorted(Comparator.comparing(
                        ch -> ch.channel().trim(), String.CASE_INSENSITIVE_ORDER))
                .map(ch -> {
                    DeliveryDescriptor d = ch.descriptor();
                    return new DeliveryChannelView(d.id(), d.displayName(), d.settingsKeys(), ch.isEnabled());
                })
                .toList();
    }
}
