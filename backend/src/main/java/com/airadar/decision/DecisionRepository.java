package com.airadar.decision;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface DecisionRepository extends JpaRepository<DecisionEntity, Long> {

    List<DecisionEntity> findByChangeIdOrderByCreatedAtDesc(Long changeId);

    List<DecisionEntity> findByStatusOrderByUpdatedAtDesc(String status);

    List<DecisionEntity> findByStatusAndRevisitAtLessThanEqualOrderByRevisitAtAsc(String status, Instant revisitAt);
}
