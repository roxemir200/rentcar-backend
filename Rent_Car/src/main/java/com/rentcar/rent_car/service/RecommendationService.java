package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.request.CarRecommendationRequest;
import com.rentcar.rent_car.dto.response.CarRecommendationResponse;

import java.util.concurrent.CompletableFuture;

public interface RecommendationService {

    CarRecommendationResponse recommendCars(CarRecommendationRequest request);

    CompletableFuture<Boolean> triggerRetrainAsync();
}
