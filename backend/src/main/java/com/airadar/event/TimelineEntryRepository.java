package com.airadar.event;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface TimelineEntryRepository extends JpaRepository<TimelineEntryEntity, Long> {

    List<TimelineEntryEntity> findByEventIdOrderByAtAsc(Long eventId);

    List<TimelineEntryEntity> findByAtGreaterThanEqualOrderByAtDesc(Instant since);

    @Query("SELECT COUNT(t) FROM TimelineEntryEntity t WHERE t.eventId = :eventId AND t.at > :since")
    long countByEventIdAndAtAfter(@Param("eventId") Long eventId, @Param("since") Instant since);
}
