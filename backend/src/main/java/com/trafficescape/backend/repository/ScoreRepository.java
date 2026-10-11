
package com.trafficescape.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.trafficescape.backend.entity.Score;

public interface ScoreRepository extends JpaRepository<Score, Long> {
}
