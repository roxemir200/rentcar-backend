package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    // Avis d'une voiture
    List<Review> findByCarId(Long carId);

    // Avis d'un client
    List<Review> findByClientId(Long clientId);

    // Vérifier si un avis existe pour une réservation
    Optional<Review> findByReservationId(Long reservationId);

    Boolean existsByReservationId(Long reservationId);

    // Note moyenne d'une voiture
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.car.id = :carId")
    Double getAverageRatingByCarId(@Param("carId") Long carId);

    // Nombre d'avis d'une voiture
    Long countByCarId(Long carId);

    // Note moyenne toutes voitures confondues (null tant qu'aucun avis n'existe)
    @Query("SELECT AVG(r.rating) FROM Review r")
    Double getAverageRating();
}