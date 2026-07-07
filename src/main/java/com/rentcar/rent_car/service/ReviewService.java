package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.request.ReviewRequest;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.ReviewResponse;

import java.util.List;

public interface ReviewService {

    MessageResponse createReview(ReviewRequest request, String clientEmail);

    List<ReviewResponse> getReviewsByCar(Long carId);

    List<ReviewResponse> getMyReviews(String clientEmail);

    Double getAverageRatingByCar(Long carId);
}