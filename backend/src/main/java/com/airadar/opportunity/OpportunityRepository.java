package com.airadar.opportunity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OpportunityRepository extends JpaRepository<OpportunityEntity, Long> {

    Optional<OpportunityEntity> findFirstByImpactId(Long impactId);

    List<OpportunityEntity> findAllByOrderByUpdatedAtDesc();

    List<OpportunityEntity> findByKindOrderByUpdatedAtDesc(String kind);
}
