package com.airadar.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EventItemRepository extends JpaRepository<EventItemEntity, Long> {

    List<EventItemEntity> findByEventId(Long eventId);

    List<EventItemEntity> findByNewsItemId(Long newsItemId);

    List<EventItemEntity> findByNewsItemIdIn(Collection<Long> newsItemIds);

    Optional<EventItemEntity> findFirstByNewsItemId(Long newsItemId);

    boolean existsByNewsItemId(Long newsItemId);

    long countByEventId(Long eventId);
}
