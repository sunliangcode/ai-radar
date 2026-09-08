package com.airadar.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SourceRepository extends JpaRepository<SourceEntity, Long> {

    List<SourceEntity> findByEnabledTrue();

    long count();
}
