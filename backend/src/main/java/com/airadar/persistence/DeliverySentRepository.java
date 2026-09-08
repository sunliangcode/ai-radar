package com.airadar.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Set;

public interface DeliverySentRepository extends JpaRepository<DeliverySentEntity, Long> {

    List<DeliverySentEntity> findByChannelAndDayAndCanonicalUrlIn(String channel, String day, Collection<String> urls);

    default Set<String> findSentUrls(String channel, String day, Collection<String> urls) {
        return findByChannelAndDayAndCanonicalUrlIn(channel, day, urls).stream()
                .map(DeliverySentEntity::getCanonicalUrl)
                .collect(java.util.stream.Collectors.toSet());
    }
}
