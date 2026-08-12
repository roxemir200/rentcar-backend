package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.ReviewRequest;
import com.rentcar.rent_car.dto.response.ReviewResponse;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.Review;
import com.rentcar.rent_car.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ReviewMapper {

    private final ReservationRepository reservationRepository;

    public Review toEntity(ReviewRequest request) {
        Reservation reservation = reservationRepository.findById(request.getReservationId())
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));

        Review review = new Review();
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        review.setClient(reservation.getClient());
        review.setCar(reservation.getCar());
        review.setReservation(reservation);

        return review;
    }

    public ReviewResponse toResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .rating(review.getRating())
                .comment(review.getComment())
                .clientFirstName(review.getClient() != null ? review.getClient().getFirstName() : null)
                .clientLastName(review.getClient() != null ? review.getClient().getLastName() : null)
                .clientId(review.getClient() != null ? review.getClient().getId() : null)
                .carBrand(review.getCar() != null ? review.getCar().getBrand() : null)
                .carModel(review.getCar() != null ? review.getCar().getModel() : null)
                .carId(review.getCar() != null ? review.getCar().getId() : null)
                .reservationId(review.getReservation() != null ? review.getReservation().getId() : null)
                .createdAt(review.getCreatedAt())
                .build();
    }
}