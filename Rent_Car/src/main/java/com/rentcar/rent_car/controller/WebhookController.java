package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final PaymentService paymentService;

    /**
     * Webhook Stripe
     * Appelé automatiquement par Stripe quand un paiement change d'état
     */
    @PostMapping("/stripe")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String signature) {
        System.out.println("🔔 WEBHOOK REÇU !!!");
        paymentService.handleWebhook(payload, signature);
        return ResponseEntity.ok("OK");
    }
}