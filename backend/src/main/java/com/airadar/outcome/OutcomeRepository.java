package com.airadar.outcome;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OutcomeRepository extends JpaRepository<OutcomeEntity, Long> {

    Optional<OutcomeEntity> findByMonthKey(String monthKey);
}
