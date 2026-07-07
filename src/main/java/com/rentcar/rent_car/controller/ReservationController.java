package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.CompleteReservationRequest;
import com.rentcar.rent_car.dto.request.ReservationRequest;
import com.rentcar.rent_car.dto.request.StartReservationRequest;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.ReservationResponse;
import com.rentcar.rent_car.security.UserDetailsImpl;
import com.rentcar.rent_car.service.ReservationService;
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
public class ReservationController {

    private final ReservationService reservationService;

    // ========== ROUTES CLIENT ==========

    // Créer une réservation (Client connecté)
    @PostMapping("/reservations")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<MessageResponse> createReservation(
            @Valid @RequestBody ReservationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        MessageResponse response = reservationService.createReservation(
                request, userDetails.getEmail());

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }

    // Voir mes réservations (Client connecté)
    @GetMapping("/reservations/my-reservations")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<List<ReservationResponse>> getMyReservations(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        return ResponseEntity.ok(
                reservationService.getMyReservations(userDetails.getEmail()));
    }

    // Voir une réservation (Client propriétaire ou Admin)
    @GetMapping("/reservations/{id}")
    public ResponseEntity<ReservationResponse> getReservationById(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.getReservationById(id));
    }

    // Annuler une réservation (Client propriétaire ou Admin)
    @PutMapping("/reservations/{id}/cancel")
    @PreAuthorize("hasAnyRole('CLIENT', 'ADMIN')")
    public ResponseEntity<MessageResponse> cancelReservation(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        MessageResponse response = reservationService.cancelReservation(
                id, userDetails.getEmail());

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }

    // ========== ROUTES ADMIN ==========

    // Voir toutes les réservations (Admin)
    @GetMapping("/admin/reservations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ReservationResponse>> getAllReservations() {
        return ResponseEntity.ok(reservationService.getAllReservations());
    }

    // Confirmer une réservation (Admin)
    @PutMapping("/admin/reservations/{id}/confirm")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> confirmReservation(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.confirmReservation(id));
    }

    // Démarrer une location (Admin)
    @PutMapping("/admin/reservations/{id}/start")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> startReservation(
            @PathVariable Long id,
            @Valid @RequestBody StartReservationRequest request) {

        return ResponseEntity.ok(reservationService.startReservation(id, request));
    }

    // Terminer une location (Admin)
    @PutMapping("/admin/reservations/{id}/complete")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> completeReservation(
            @PathVariable Long id,
            @Valid @RequestBody CompleteReservationRequest request) {

        return ResponseEntity.ok(reservationService.completeReservation(id, request));
    }
}