package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.CreatePaymentRequest;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.PaymentIntentResponse;
import com.rentcar.rent_car.dto.response.PaymentResponse;
import com.rentcar.rent_car.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PaymentController {


    private final PaymentService paymentService;

    /**
     * Créer un PaymentIntent Stripe
     * Retourne le clientSecret que le frontend utilise pour confirmer le paiement
     */
    @PostMapping("/payments/create-intent")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<PaymentIntentResponse> createPaymentIntent(
            @Valid @RequestBody CreatePaymentRequest request) {
        return ResponseEntity.ok(paymentService.createPaymentIntent(request.getReservationId()));
    }

    /**
     * Voir le paiement d'une réservation
     */
    @GetMapping("/payments/reservation/{reservationId}")
    public ResponseEntity<PaymentResponse> getPaymentByReservation(@PathVariable Long reservationId) {
        return ResponseEntity.ok(paymentService.getPaymentByReservation(reservationId));
    }

    /**
     * Voir tous les paiements (Admin)
     */
    @GetMapping("/admin/payments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PaymentResponse>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }

    /**
     * Rembourser un paiement (Admin)
     */
    @PostMapping("/admin/payments/{id}/refund")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> refundPayment(@PathVariable Long id) {
        MessageResponse response = paymentService.refundPayment(id);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }

}