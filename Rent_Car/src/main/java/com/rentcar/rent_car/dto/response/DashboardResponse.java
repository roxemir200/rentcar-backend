package com.rentcar.rent_car.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    // Véhicules
    private Long totalCars;
    private Long availableCars;
    private Long rentedCars;
    private Long reservedCars;
    private Long maintenanceCars;

    // Réservations
    private Long totalReservations;
    private Long pendingReservations;
    private Long confirmedReservations;
    private Long inProgressReservations;
    private Long completedReservations;
    private Long cancelledReservations;

    // Clients
    private Long totalClients;
    private Long activeClients;

    // Revenus
    private BigDecimal totalRevenue;
    private BigDecimal revenueThisMonth;

    // Avis
    private Double averageRating;
    private Long totalReviews;

    // Paiements
    private Long completedPayments;
    private Long pendingPayments;
    private Long refundedPayments;
}