package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByClientId(Long clientId);
    List<Reservation> findByCarId(Long carId);
    List<Reservation> findByStatus(ReservationStatus status);
    List<Reservation> findByClientIdAndStatus(Long clientId, ReservationStatus status);

    // Vérifier disponibilité avec IN_PROGRESS
    @Query("SELECT COUNT(r) > 0 FROM Reservation r WHERE r.car.id = :carId " +
            "AND r.status IN :statuses " +
            "AND r.startDate <= :endDate AND r.endDate >= :startDate")
    boolean isCarUnavailable(@Param("carId") Long carId,
                             @Param("startDate") LocalDate startDate,
                             @Param("endDate") LocalDate endDate,
                             @Param("statuses") List<ReservationStatus> statuses);

    // Réservations actives d'un client
    @Query("SELECT r FROM Reservation r WHERE r.client.id = :clientId " +
            "AND r.status IN :statuses")
    List<Reservation> findActiveReservationsByClientId(@Param("clientId") Long clientId,
                                                       @Param("statuses") List<ReservationStatus> statuses);

    List<Reservation> findByStartDateBetween(LocalDate start, LocalDate end);
}