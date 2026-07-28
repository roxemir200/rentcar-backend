package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.CarRecommendationRequest;
import com.rentcar.rent_car.dto.response.CarRecommendationResponse;
import com.rentcar.rent_car.service.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @PostMapping("/cars")
    public ResponseEntity<CarRecommendationResponse> recommendCars(
            @Valid @RequestBody CarRecommendationRequest request
    ) {
        CarRecommendationResponse result = recommendationService.recommendCars(request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/cars")
    public ResponseEntity<CarRecommendationResponse> recommendCarsGet(
            @RequestParam(defaultValue = "QUOTIDIEN") String objective,
            @RequestParam(defaultValue = "60") BigDecimal budget,
            @RequestParam(defaultValue = "4") Integer passengers,
            @RequestParam(defaultValue = "3") Integer duration,
            @RequestParam(defaultValue = "ANY") String transmission,
            @RequestParam(defaultValue = "3") Integer topK
    ) {
        CarRecommendationRequest req = CarRecommendationRequest.builder()
                .objective(objective)
                .budget(budget)
                .passengers(passengers)
                .duration(duration)
                .transmission(transmission)
                .topK(topK)
                .build();
        return ResponseEntity.ok(recommendationService.recommendCars(req));
    }

    @PostMapping("/train")
    public ResponseEntity<Map<String, Object>> retrain() {
        CompletableFuture<Boolean> running = recommendationService.triggerRetrainAsync();
        return ResponseEntity.accepted().body(Map.of(
                "success", true,
                "started", true,
                "message", "Réentraînement du service ML démarré en arrière-plan."
        ));
    }
}
