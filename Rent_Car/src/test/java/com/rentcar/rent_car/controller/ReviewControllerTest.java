package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.ReviewRequest;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.ReviewResponse;
import com.rentcar.rent_car.security.UserDetailsImpl;
import com.rentcar.rent_car.service.ReviewService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewControllerTest {

    @Mock
    private ReviewService reviewService;

    @InjectMocks
    private ReviewController reviewController;

    private UserDetailsImpl userDetails;

    @BeforeEach
    void setUp() {
        userDetails = new UserDetailsImpl(1L, "client@test.com", "pass", null, true);
    }

    @Test
    void shouldCreateReview_whenSuccess() {
        when(reviewService.createReview(any(ReviewRequest.class), eq("client@test.com")))
                .thenReturn(MessageResponse.success("Avis ajouté"));

        ResponseEntity<MessageResponse> response = reviewController.createReview(new ReviewRequest(), userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().isSuccess()).isTrue();
    }

    @Test
    void shouldCreateReview_whenError() {
        when(reviewService.createReview(any(ReviewRequest.class), eq("client@test.com")))
                .thenReturn(MessageResponse.error("Location non terminée"));

        ResponseEntity<MessageResponse> response = reviewController.createReview(new ReviewRequest(), userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().isSuccess()).isFalse();
    }

    @Test
    void shouldGetReviewsByCar() {
        when(reviewService.getReviewsByCar(10L)).thenReturn(List.of(new ReviewResponse()));

        ResponseEntity<List<ReviewResponse>> response = reviewController.getReviewsByCar(10L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldGetMyReviews() {
        when(reviewService.getMyReviews("client@test.com")).thenReturn(List.of(new ReviewResponse()));

        ResponseEntity<List<ReviewResponse>> response = reviewController.getMyReviews(userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldGetAverageRating() {
        when(reviewService.getAverageRatingByCar(10L)).thenReturn(4.8);

        ResponseEntity<Double> response = reviewController.getAverageRating(10L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(4.8);
    }
}
