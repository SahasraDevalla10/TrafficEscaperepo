
package com.trafficescape.backend;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.trafficescape.backend.entity.Score;
import com.trafficescape.backend.repository.ScoreRepository;

@RestController
@RequestMapping("/api/scores")
@CrossOrigin(origins = "http://localhost:5173")
public class ScoreController {

    private final ScoreRepository scoreRepository;

    public ScoreController(ScoreRepository scoreRepository) {
        this.scoreRepository = scoreRepository;
    }

    @PostMapping
    public Score saveScore(@RequestBody Score score) {
        return scoreRepository.save(score);
    }

    @GetMapping
    public List<Score> getAllScores() {
        return scoreRepository.findAll();
    }
}
