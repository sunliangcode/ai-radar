package com.airadar.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface EventRepository extends JpaRepository<EventEntity, Long> {

    List<EventEntity> findByLastUpdatedAtGreaterThanEqualOrderByScoreDesc(Instant since);

    List<EventEntity> findByStatusOrderByScoreDesc(EventStatus status);

    List<EventEntity> findByStatusInOrderByScoreDesc(Collection<EventStatus> statuses);

    List<EventEntity> findTop50ByOrderByScoreDesc();
}
