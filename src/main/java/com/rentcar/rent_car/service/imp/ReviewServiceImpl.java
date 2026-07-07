package com.rentcar.rent_car.service.impl;

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
import com.rentcar.rent_car.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReservationRepository reservationRepository;
    private final UserRepository userRepository;
    private final ReviewMapper reviewMapper;

    @Override
    @Transactional
    public MessageResponse createReview(ReviewRequest request, String clientEmail) {

        // 1. Trouver la réservation
        Reservation reservation = reservationRepository.findById(request.getReservationId())
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));

        // 2. Vérifier que la réservation est COMPLETED
        if (reservation.getStatus() != ReservationStatus.COMPLETED) {
            return MessageResponse.error("Vous ne pouvez donner un avis que sur une location terminée");
        }

        // 3. Vérifier que le client est bien le propriétaire de la réservation
        User client = userRepository.findByEmail(clientEmail)
                .orElseThrow(() -> new RuntimeException("Client non trouvé"));

        if (!reservation.getClient().getId().equals(client.getId())) {
            return MessageResponse.error("Vous n'êtes pas autorisé à donner un avis sur cette réservation");
        }

        // 4. Vérifier qu'il n'y a pas déjà un avis pour cette réservation
        if (reviewRepository.existsByReservationId(request.getReservationId())) {
            return MessageResponse.error("Vous avez déjà donné un avis pour cette réservation");
        }

        // 5. Créer l'avis
        Review review = reviewMapper.toEntity(request);
        reviewRepository.save(review);

        return MessageResponse.success("Avis ajouté avec succès", reviewMapper.toResponse(review));
    }

    @Override
    public List<ReviewResponse> getReviewsByCar(Long carId) {
        return reviewRepository.findByCarId(carId)
                .stream()
                .map(reviewMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<ReviewResponse> getMyReviews(String clientEmail) {
        User client = userRepository.findByEmail(clientEmail)
                .orElseThrow(() -> new RuntimeException("Client non trouvé"));

        return reviewRepository.findByClientId(client.getId())
                .stream()
                .map(reviewMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public Double getAverageRatingByCar(Long carId) {
        return reviewRepository.getAverageRatingByCarId(carId);
    }
}