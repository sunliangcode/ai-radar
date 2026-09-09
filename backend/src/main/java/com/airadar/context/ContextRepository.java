package com.airadar.context;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ContextRepository extends JpaRepository<UserContextEntity, Long> {
}
