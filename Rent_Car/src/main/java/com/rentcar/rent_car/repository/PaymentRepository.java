package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Payment;
import com.rentcar.rent_car.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByReservationId(Long reservationId);

    Optional<Payment> findByExternalPaymentId(String externalPaymentId);

    List<Payment> findByStatus(PaymentStatus status);
    Optional<Payment> findTopByStatusOrderByCreatedAtDesc(PaymentStatus status);
}