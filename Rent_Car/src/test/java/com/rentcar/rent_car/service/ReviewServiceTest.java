package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.mapper.ReviewMapper;
import com.rentcar.rent_car.dto.request.ReviewRequest;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.ReviewResponse;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.Review;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.repository.ReviewRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.service.imp.ReviewServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ReviewMapper reviewMapper;

    @InjectMocks
    private ReviewServiceImpl reviewService;

    private Reservation reservation;
    private User client;
    private Review review;
    private ReviewRequest request;

    @BeforeEach
    void setUp() {
        client = new User();
        client.setId(1L);
        client.setEmail("client@test.com");

        reservation = new Reservation();
        reservation.setId(10L);
        reservation.setClient(client);
        reservation.setStatus(ReservationStatus.COMPLETED);

        request = new ReviewRequest();
        request.setReservationId(10L);
        request.setRating(5);
        request.setComment("Excellente voiture !");

        review = new Review();
        review.setId(100L);
    }

    @Test
    void shouldCreateReview_successfully() {
        when(reservationRepository.findById(10L)).thenReturn(Optional.of(reservation));
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(reviewRepository.existsByReservationId(10L)).thenReturn(false);
        when(reviewMapper.toEntity(request)).thenReturn(review);
        when(reviewRepository.save(any(Review.class))).thenReturn(review);
        when(reviewMapper.toResponse(review)).thenReturn(new ReviewResponse());

        MessageResponse response = reviewService.createReview(request, "client@test.com");

        assertThat(response.isSuccess()).isTrue();
        verify(reviewRepository).save(review);
    }

    @Test
    void shouldThrow_whenCreateReviewReservationNotFound() {
        when(reservationRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reviewService.createReview(request, "client@test.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Réservation non trouvée");
    }

    @Test
    void shouldReturnError_whenReservationNotCompleted() {
        reservation.setStatus(ReservationStatus.IN_PROGRESS);
        when(reservationRepository.findById(10L)).thenReturn(Optional.of(reservation));

        MessageResponse response = reviewService.createReview(request, "client@test.com");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("location terminée");
    }

    @Test
    void shouldThrow_whenCreateReviewClientNotFound() {
        when(reservationRepository.findById(10L)).thenReturn(Optional.of(reservation));
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reviewService.createReview(request, "client@test.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Client non trouvé");
    }

    @Test
    void shouldReturnError_whenClientNotOwnerOfReservation() {
        User otherUser = new User();
        otherUser.setId(99L);
        when(reservationRepository.findById(10L)).thenReturn(Optional.of(reservation));
        when(userRepository.findByEmail("other@test.com")).thenReturn(Optional.of(otherUser));

        MessageResponse response = reviewService.createReview(request, "other@test.com");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("pas autorisé");
    }

    @Test
    void shouldReturnError_whenReviewAlreadyExistsForReservation() {
        when(reservationRepository.findById(10L)).thenReturn(Optional.of(reservation));
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(reviewRepository.existsByReservationId(10L)).thenReturn(true);

        MessageResponse response = reviewService.createReview(request, "client@test.com");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("déjà donné un avis");
    }

    @Test
    void shouldGetReviewsByCar() {
        when(reviewRepository.findByCarId(5L)).thenReturn(List.of(review));
        when(reviewMapper.toResponse(review)).thenReturn(new ReviewResponse());

        List<ReviewResponse> result = reviewService.getReviewsByCar(5L);

        assertThat(result).hasSize(1);
    }

    @Test
    void shouldGetMyReviews() {
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(reviewRepository.findByClientId(1L)).thenReturn(List.of(review));
        when(reviewMapper.toResponse(review)).thenReturn(new ReviewResponse());

        List<ReviewResponse> result = reviewService.getMyReviews("client@test.com");

        assertThat(result).hasSize(1);
    }

    @Test
    void shouldThrow_whenGetMyReviewsClientNotFound() {
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reviewService.getMyReviews("unknown@test.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Client non trouvé");
    }

    @Test
    void shouldGetAverageRatingByCar() {
        when(reviewRepository.getAverageRatingByCarId(5L)).thenReturn(4.5);

        Double avg = reviewService.getAverageRatingByCar(5L);

        assertThat(avg).isEqualTo(4.5);
    }
}
