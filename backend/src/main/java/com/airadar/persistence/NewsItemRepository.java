package com.airadar.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NewsItemRepository extends JpaRepository<NewsItemEntity, Long> {

    Optional<NewsItemEntity> findByCanonicalUrl(String canonicalUrl);

    List<NewsItemEntity> findByCanonicalUrlIn(Collection<String> urls);

    List<NewsItemEntity> findByCreatedAtGreaterThanEqualOrderByScoreDesc(Instant since);

    List<NewsItemEntity> findByPrimarySourceTypeAndCreatedAtGreaterThanEqualOrderByScoreDesc(
            com.airadar.domain.SourceType sourceType, Instant since);

    /** SQLite stores timestamps as ISO-8601 TEXT; bind as String to avoid Hibernate Instant coercion bugs. */
    @Query(value = "SELECT * FROM news_items WHERE primary_source_type = :type AND created_at >= :since ORDER BY score DESC",
            nativeQuery = true)
    List<NewsItemEntity> findBySourceTypeSinceNative(@Param("type") String type, @Param("since") String since);

    @Query(value = "SELECT * FROM news_items WHERE created_at >= :since ORDER BY score DESC",
            nativeQuery = true)
    List<NewsItemEntity> findByCreatedSinceNative(@Param("since") String since);

    List<NewsItemEntity> findByUpdatedAtGreaterThanEqualOrderByScoreDesc(Instant since);

    List<NewsItemEntity> findByReadFlagFalse();

    List<NewsItemEntity> findBySavedTrue();

    List<NewsItemEntity> findTop20ByOrderByCreatedAtDesc();

    List<NewsItemEntity> findByTitleContainingIgnoreCaseOrContentSnippetContainingIgnoreCase(
        String title, String snippet);

    long countByReadFlagFalse();
}
