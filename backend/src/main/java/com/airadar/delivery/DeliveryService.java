package com.airadar.delivery;

import com.airadar.domain.NewsItem;
import com.airadar.event.EventEntity;
import com.airadar.event.EventItemEntity;
import com.airadar.event.EventItemRepository;
import com.airadar.event.EventRepository;
import com.airadar.persistence.DeliveryLogEntity;
import com.airadar.persistence.DeliveryLogRepository;
import com.airadar.persistence.DeliverySentEntity;
import com.airadar.persistence.DeliverySentRepository;
import com.airadar.persistence.EntityMapper;
import com.airadar.persistence.NewsItemRepository;
import com.airadar.settings.SettingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class DeliveryService {

    private static final Logger log = LoggerFactory.getLogger(DeliveryService.class);

    private final List<DeliveryChannel> channels;
    private final NewsItemRepository newsItemRepository;
    private final EntityMapper entityMapper;
    private final SettingsService settingsService;
    private final DeliveryLogRepository deliveryLogRepository;
    private final DeliverySentRepository deliverySentRepository;
    private final EventRepository eventRepository;
    private final EventItemRepository eventItemRepository;

    public DeliveryService(
            List<DeliveryChannel> channels,
            NewsItemRepository newsItemRepository,
            EntityMapper entityMapper,
            SettingsService settingsService,
            DeliveryLogRepository deliveryLogRepository,
            DeliverySentRepository deliverySentRepository,
            EventRepository eventRepository,
            EventItemRepository eventItemRepository
    ) {
        this.channels = channels;
        this.newsItemRepository = newsItemRepository;
        this.entityMapper = entityMapper;
        this.settingsService = settingsService;
        this.deliveryLogRepository = deliveryLogRepository;
        this.deliverySentRepository = deliverySentRepository;
        this.eventRepository = eventRepository;
        this.eventItemRepository = eventItemRepository;
    }

    @Transactional
    public Map<String, Object> pushToday() {
        var s = settingsService.effective();
        ZoneId zone = ZoneId.of(s.timezone() != null ? s.timezone() : "Asia/Shanghai");
        LocalDate day = LocalDate.now(zone);
        Instant since = day.atStartOfDay(zone).toInstant();
        int threshold = s.scoreThreshold() != null ? s.scoreThreshold() : 60;
        int maxItems = s.maxItems() != null ? s.maxItems() : 30;

        List<NewsItem> candidates = newsItemRepository.findByCreatedAtGreaterThanEqualOrderByScoreDesc(since)
                .stream()
                .map(entityMapper::toDomain)
                .filter(i -> i.getScore() != null && i.getScore() >= threshold)
                .sorted(Comparator.comparing(NewsItem::getScore, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(maxItems)
                .toList();

        List<BriefPayload.BriefEvent> events = loadTopEvents(since, maxItems);

        boolean pushOnlyWhenItems = s.pushOnlyWhenItems() == null || s.pushOnlyWhenItems();
        List<DeliveryChannel> enabled = channels.stream().filter(DeliveryChannel::isEnabled).toList();
        if (enabled.isEmpty()) {
            log.info("push_skipped reason=no_channels");
            return Map.of(
                    "skipped", true,
                    "reason", "no_channels",
                    "date", day.toString(),
                    "itemCount", candidates.size(),
                    "eventCount", events.size(),
                    "results", List.of()
            );
        }
        if (pushOnlyWhenItems && candidates.isEmpty() && events.isEmpty()) {
            log.info("push_skipped reason=no_items date={}", day);
            return Map.of(
                    "skipped", true,
                    "reason", "no_items",
                    "date", day.toString(),
                    "itemCount", 0,
                    "eventCount", 0,
                    "results", List.of()
            );
        }

        List<Map<String, Object>> results = new ArrayList<>();
        for (DeliveryChannel channel : enabled) {
            List<NewsItem> fresh = filterUnsent(channel.channel(), day.toString(), candidates);
            if (pushOnlyWhenItems && fresh.isEmpty() && events.isEmpty()) {
                log.info("push_channel_skipped channel={} reason=already_sent", channel.channel());
                results.add(Map.of(
                        "channel", channel.channel(),
                        "success", true,
                        "skipped", true,
                        "reason", "already_sent",
                        "itemCount", 0
                ));
                continue;
            }
            BriefPayload payload = toPayload(day, fresh, events, s.uiBaseUrl());
            DeliveryResult result = channel.deliver(payload);
            persistLog(result);
            if (result.success() && (result.error() == null || !result.error().startsWith("skipped:"))) {
                markSent(channel.channel(), day.toString(), fresh);
            }
            Map<String, Object> row = new HashMap<>();
            row.put("channel", result.channel());
            row.put("success", result.success());
            row.put("itemCount", result.itemCount());
            row.put("durationMs", result.durationMs());
            if (result.error() != null) {
                row.put("error", result.error());
            }
            results.add(row);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("skipped", false);
        out.put("date", day.toString());
        out.put("itemCount", candidates.size());
        out.put("eventCount", events.size());
        out.put("results", results);
        return out;
    }

    private List<BriefPayload.BriefEvent> loadTopEvents(Instant since, int limit) {
        return eventRepository.findByLastUpdatedAtGreaterThanEqualOrderByScoreDesc(since).stream()
                .limit(limit)
                .map(this::toBriefEvent)
                .toList();
    }

    private BriefPayload.BriefEvent toBriefEvent(EventEntity event) {
        List<EventItemEntity> links = eventItemRepository.findByEventId(event.getId());
        List<BriefPayload.BriefItem> evidence = new ArrayList<>();
        for (EventItemEntity link : links) {
            newsItemRepository.findById(link.getNewsItemId()).ifPresent(e -> {
                NewsItem item = entityMapper.toDomain(e);
                evidence.add(new BriefPayload.BriefItem(
                        item.getTitle(),
                        item.getScore() == null ? 0 : item.getScore(),
                        item.getSummary(),
                        item.getCanonicalUrl()
                ));
            });
            if (evidence.size() >= 3) {
                break;
            }
        }
        return new BriefPayload.BriefEvent(
                event.getId(),
                event.getTitle(),
                event.getScore() == null ? 0 : event.getScore(),
                event.getStatus() == null ? "" : event.getStatus().name(),
                event.getSummary(),
                event.getImpact(),
                event.getWatchNext(),
                evidence
        );
    }

    private List<NewsItem> filterUnsent(String channel, String day, List<NewsItem> items) {
        List<String> urls = items.stream().map(NewsItem::getCanonicalUrl).toList();
        if (urls.isEmpty()) {
            return List.of();
        }
        Set<String> sent = deliverySentRepository.findSentUrls(channel, day, urls);
        return items.stream().filter(i -> !sent.contains(i.getCanonicalUrl())).toList();
    }

    private void markSent(String channel, String day, List<NewsItem> items) {
        for (NewsItem item : items) {
            if (item.getCanonicalUrl() == null) {
                continue;
            }
            DeliverySentEntity entity = new DeliverySentEntity();
            entity.setChannel(channel);
            entity.setDay(day);
            entity.setCanonicalUrl(item.getCanonicalUrl());
            try {
                deliverySentRepository.save(entity);
            } catch (Exception e) {
                log.debug("delivery_sent_dup channel={} url={}", channel, item.getCanonicalUrl());
            }
        }
    }

    private void persistLog(DeliveryResult result) {
        DeliveryLogEntity logEntity = new DeliveryLogEntity();
        logEntity.setChannel(result.channel());
        logEntity.setSuccess(result.success());
        logEntity.setItemCount(result.itemCount());
        logEntity.setDurationMs(result.durationMs());
        logEntity.setErrorMessage(result.error());
        deliveryLogRepository.save(logEntity);
    }

    private BriefPayload toPayload(LocalDate day, List<NewsItem> items, List<BriefPayload.BriefEvent> events, String uiUrl) {
        List<BriefPayload.BriefItem> briefItems = items.stream()
                .map(i -> new BriefPayload.BriefItem(
                        i.getTitle(),
                        i.getScore() == null ? 0 : i.getScore(),
                        i.getSummary(),
                        i.getCanonicalUrl()
                ))
                .toList();
        return new BriefPayload(day, Instant.now(), briefItems, events, uiUrl);
    }
}
