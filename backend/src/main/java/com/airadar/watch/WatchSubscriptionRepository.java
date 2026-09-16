package com.airadar.watch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WatchSubscriptionRepository extends JpaRepository<WatchSubscriptionEntity, Long> {

    Optional<WatchSubscriptionEntity> findFirstByChangeId(Long changeId);

    List<WatchSubscriptionEntity> findAllByOrderByUpdatedAtDesc();
}
