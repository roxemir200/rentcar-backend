package com.rentcar.rent_car.enums;

public enum ReservationStatus {
    PENDING,        // En attente de confirmation
    CONFIRMED,      // Confirmée (avant le début)
    IN_PROGRESS,    // Location en cours
    COMPLETED,      // Terminée
    CANCELLED       // Annulée
}