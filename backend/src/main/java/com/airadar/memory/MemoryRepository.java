package com.airadar.memory;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemoryRepository extends JpaRepository<MemoryEntity, Long> {

    List<MemoryEntity> findTop20ByOrderByCreatedAtDesc();

    List<MemoryEntity> findByKindAndRefType(String kind, String refType);
}
