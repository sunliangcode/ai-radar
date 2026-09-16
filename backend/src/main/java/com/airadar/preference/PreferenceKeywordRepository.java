package com.airadar.preference;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PreferenceKeywordRepository extends JpaRepository<PreferenceKeywordEntity, Long> {

    List<PreferenceKeywordEntity> findByKindOrderByCreatedAtDesc(String kind);

    List<PreferenceKeywordEntity> findAllByOrderByCreatedAtDesc();

    List<PreferenceKeywordEntity> findByKindAndSource(String kind, String source);

    boolean existsByKindAndTextIgnoreCase(String kind, String text);
}
