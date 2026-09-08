package com.airadar.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveryLogRepository extends JpaRepository<DeliveryLogEntity, Long> {

    List<DeliveryLogEntity> findTop20ByOrderByCreatedAtDesc();
}
