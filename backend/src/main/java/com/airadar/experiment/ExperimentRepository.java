package com.airadar.experiment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExperimentRepository extends JpaRepository<ExperimentEntity, Long> {

    Optional<ExperimentEntity> findFirstByActionIdAndStatus(Long actionId, String status);

    List<ExperimentEntity> findByStatusOrderByUpdatedAtDesc(String status);

    List<ExperimentEntity> findAllByOrderByUpdatedAtDesc();
}
