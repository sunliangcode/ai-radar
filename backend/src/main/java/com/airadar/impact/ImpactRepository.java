package com.airadar.impact;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ImpactRepository extends JpaRepository<ImpactEntity, Long> {

    Optional<ImpactEntity> findByEventId(Long eventId);

    List<ImpactEntity> findByTierNotOrderByPriorityDesc(String tier);

    List<ImpactEntity> findByTierInOrderByPriorityDesc(List<String> tiers);

    List<ImpactEntity> findAllByOrderByPriorityDesc();
}
