package com.airadar.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface TimelineEntryRepository extends JpaRepository<TimelineEntryEntity, Long> {

    List<TimelineEntryEntity> findByEventIdOrderByAtAsc(Long eventId);

    List<TimelineEntryEntity> findByAtGreaterThanEqualOrderByAtDesc(Instant since);
}
