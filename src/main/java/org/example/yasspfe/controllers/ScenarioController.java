package org.example.yasspfe.controllers;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/scenario")
public class ScenarioController {

    private static final Logger logger = LoggerFactory.getLogger(ScenarioController.class);

    private final ScenarioService scenarioService;
    private final DatabaseStressTester databaseStressTester;

    public ScenarioController(ScenarioService scenarioService, DatabaseStressTester databaseStressTester) {
        this.scenarioService = scenarioService;
        this.databaseStressTester = databaseStressTester;
    }

    @PutMapping("/toggle/{name}")
    @PostMapping("/toggle/{name}")
    public ResponseEntity<Map<String, Object>> toggleScenario(@PathVariable String name) {
        try {
            logger.info("Toggling scenario: {}", name);
            boolean result = scenarioService.toggleScenario(name);
            logger.info("Toggle result for {}: {}", name, result);

            // If toggled to enabled and it's the stress test, try to start it
            if (result && "stress_testing".equals(name)) {
                boolean started = databaseStressTester.startStressTest();
                logger.info("Stress test auto-start on toggle: {}", started);
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "enabled", result,
                        "stressTestStarted", started
                ));
            }

            // If toggled to disabled and it's the stress test, stop it
            if (!result && "stress_testing".equals(name) && databaseStressTester.isRunning()) {
                databaseStressTester.stopStressTest();
            }

            return ResponseEntity.ok(Map.of("success", true, "enabled", result));
        } catch (Exception e) {
            logger.error("Error toggling scenario: {}", name, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }
} 