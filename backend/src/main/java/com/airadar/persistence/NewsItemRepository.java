package com.airadar.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NewsItemRepository extends JpaRepository<NewsItemEntity, Long> {

    Optional<NewsItemEntity> findByCanonicalUrl(String canonicalUrl);

    List<NewsItemEntity> findByCanonicalUrlIn(Collection<String> urls);

    List<NewsItemEntity> findByCreatedAtGreaterThanEqualOrderByScoreDesc(Instant since);

    List<NewsItemEntity> findByUpdatedAtGreaterThanEqualOrderByScoreDesc(Instant since);

    List<NewsItemEntity> findByReadFlagFalse();

    List<NewsItemEntity> findTop20ByOrderByCreatedAtDesc();
}
