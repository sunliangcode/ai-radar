package com.airadar.persistence;

import com.airadar.domain.SourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SourceRepository extends JpaRepository<SourceEntity, Long> {

    List<SourceEntity> findByEnabledTrue();

    Optional<SourceEntity> findFirstByType(SourceType type);

    long count();

    /** Narrow update — avoids rewriting config_json / name / type on every fetch. */
    @Modifying(clearAutomatically = true)
    @Query("update SourceEntity s set s.lastFetchedAt = :now, s.updatedAt = :now where s.id in :ids")
    int touchLastFetchedAt(@Param("ids") Collection<Long> ids, @Param("now") Instant now);
}
