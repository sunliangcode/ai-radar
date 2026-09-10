package com.airadar.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RepoStarSnapshotRepository
        extends JpaRepository<RepoStarSnapshotEntity, RepoStarSnapshotEntity.PK> {

    Optional<RepoStarSnapshotEntity> findFirstByRepoUrlOrderByCapturedAtDesc(String repoUrl);

    @Query("""
        select s from RepoStarSnapshotEntity s
        where s.repoUrl = :repoUrl and s.capturedAt <= :before
        order by s.capturedAt desc
        limit 1
    """)
    Optional<RepoStarSnapshotEntity> findSnapshotBefore(@Param("repoUrl") String repoUrl,
                                                        @Param("before") String before);

    @Query("""
        select s.primarySourceType as t, count(s) as c from NewsItemEntity s
        where s.readFlag = false group by s.primarySourceType
    """)
    List<Object[]> unreadCountsBySourceType();
}
