package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.ReviewRequest;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.ReviewResponse;
import com.rentcar.rent_car.security.UserDetailsImpl;
import com.rentcar.rent_car.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    // Donner un avis (Client uniquement)
    @PostMapping("/reviews")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<MessageResponse> createReview(
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        MessageResponse response = reviewService.createReview(request, userDetails.getEmail());

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }

    // Voir les avis d'une voiture (Public)
    @GetMapping("/reviews/car/{carId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByCar(@PathVariable Long carId) {
        return ResponseEntity.ok(reviewService.getReviewsByCar(carId));
    }

    // Voir mes avis (Client)
    @GetMapping("/reviews/my-reviews")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<List<ReviewResponse>> getMyReviews(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(reviewService.getMyReviews(userDetails.getEmail()));
    }

    // Note moyenne d'une voiture (Public)
    @GetMapping("/reviews/car/{carId}/average")
    public ResponseEntity<Double> getAverageRating(@PathVariable Long carId) {
        return ResponseEntity.ok(reviewService.getAverageRatingByCar(carId));
    }
}