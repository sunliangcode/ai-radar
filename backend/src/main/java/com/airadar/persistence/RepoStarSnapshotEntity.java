package com.airadar.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "repo_star_snapshots")
@IdClass(RepoStarSnapshotEntity.PK.class)
public class RepoStarSnapshotEntity {

    @Id
    @Column(name = "repo_url")
    private String repoUrl;

    @Id
    @Column(name = "captured_at")
    private String capturedAt;

    @Column(nullable = false)
    private int stars;

    public static class PK implements Serializable {
        private String repoUrl;
        private String capturedAt;

        public PK() {}
        public PK(String repoUrl, String capturedAt) {
            this.repoUrl = repoUrl;
            this.capturedAt = capturedAt;
        }
        @Override public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PK pk)) return false;
            return Objects.equals(repoUrl, pk.repoUrl) && Objects.equals(capturedAt, pk.capturedAt);
        }
        @Override public int hashCode() { return Objects.hash(repoUrl, capturedAt); }
    }

    public String getRepoUrl() { return repoUrl; }
    public void setRepoUrl(String repoUrl) { this.repoUrl = repoUrl; }
    public String getCapturedAt() { return capturedAt; }
    public void setCapturedAt(String capturedAt) { this.capturedAt = capturedAt; }
    public int getStars() { return stars; }
    public void setStars(int stars) { this.stars = stars; }

    public Instant capturedInstant() {
        try { return Instant.parse(capturedAt); } catch (Exception e) { return null; }
    }
}
