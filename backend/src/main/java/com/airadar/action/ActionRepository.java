package com.airadar.action;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ActionRepository extends JpaRepository<ActionEntity, Long> {

    Optional<ActionEntity> findFirstByImpactId(Long impactId);

    List<ActionEntity> findByStatusInOrderByUpdatedAtDesc(List<String> statuses);

    List<ActionEntity> findAllByOrderByUpdatedAtDesc();

    long countByStatus(String status);
}
