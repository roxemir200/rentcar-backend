package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.CarRecommendationRequest;
import com.rentcar.rent_car.dto.response.CarRecommendationResponse;
import com.rentcar.rent_car.service.RecommendationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecommendationControllerTest {

    @Mock
    private RecommendationService recommendationService;

    @InjectMocks
    private RecommendationController recommendationController;

    @Test
    void shouldRecommendCarsPost() {
        CarRecommendationResponse expected = new CarRecommendationResponse();
        when(recommendationService.recommendCars(any(CarRecommendationRequest.class))).thenReturn(expected);

        ResponseEntity<CarRecommendationResponse> response = recommendationController.recommendCars(new CarRecommendationRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(expected);
    }

    @Test
    void shouldRecommendCarsGet() {
        CarRecommendationResponse expected = new CarRecommendationResponse();
        when(recommendationService.recommendCars(any(CarRecommendationRequest.class))).thenReturn(expected);

        ResponseEntity<CarRecommendationResponse> response = recommendationController.recommendCarsGet(
                "QUOTIDIEN", BigDecimal.valueOf(60), 4, 3, "ANY", 3
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(expected);
    }

    @Test
    void shouldRetrain() {
        when(recommendationService.triggerRetrainAsync()).thenReturn(CompletableFuture.completedFuture(true));

        ResponseEntity<Map<String, Object>> response = recommendationController.retrain();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        assertThat(response.getBody().get("success")).isEqualTo(true);
    }
}
