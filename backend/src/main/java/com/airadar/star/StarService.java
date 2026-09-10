package com.airadar.star;

import com.airadar.persistence.RepoStarSnapshotEntity;
import com.airadar.persistence.RepoStarSnapshotRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/**
 * Lazily records GitHub star snapshots and computes a 7-day delta.
 * A snapshot is written at most once per hour per repo, so this stays cheap.
 */
@Service
public class StarService {

    private final RepoStarSnapshotRepository repository;

    public StarService(RepoStarSnapshotRepository repository) {
        this.repository = repository;
    }

    /** Returns stars added in the last 7 days (can be negative). Null if unknown. */
    @Transactional
    public Integer delta7d(String repoUrl, Integer currentStars) {
        if (repoUrl == null || currentStars == null || currentStars <= 0) {
            return null;
        }
        recordIfStale(repoUrl, currentStars);
        Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        Optional<RepoStarSnapshotEntity> old =
                repository.findSnapshotBefore(repoUrl, weekAgo.toString());
        return old.map(s -> currentStars - s.getStars()).orElse(null);
    }

    private void recordIfStale(String repoUrl, int currentStars) {
        Optional<RepoStarSnapshotEntity> latest =
                repository.findFirstByRepoUrlOrderByCapturedAtDesc(repoUrl);
        boolean write = latest.isEmpty();
        if (latest.isPresent()) {
            Instant at = latest.get().capturedInstant();
            write = at == null || at.isBefore(Instant.now().minus(1, ChronoUnit.HOURS));
        }
        if (write) {
            RepoStarSnapshotEntity e = new RepoStarSnapshotEntity();
            e.setRepoUrl(repoUrl);
            e.setCapturedAt(Instant.now().toString());
            e.setStars(currentStars);
            repository.save(e);
        }
    }
}
