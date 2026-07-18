package com.rentcar.rent_car.service.impl;

import com.rentcar.rent_car.dto.mapper.PaymentMapper;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.PaymentIntentResponse;
import com.rentcar.rent_car.dto.response.PaymentResponse;
import com.rentcar.rent_car.entity.Contract;
import com.rentcar.rent_car.entity.Payment;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.ContractStatus;
import com.rentcar.rent_car.enums.PaymentStatus;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.ContractRepository;
import com.rentcar.rent_car.repository.PaymentRepository;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.service.PaymentService;
import com.rentcar.rent_car.service.SseService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {
    private final SseService sseService;

    private final PaymentRepository paymentRepository;
    private final ReservationRepository reservationRepository;
    private final ContractRepository contractRepository;
    private final CarRepository carRepository;
    private final PaymentMapper paymentMapper;

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    @Override
    @Transactional
    public PaymentIntentResponse createPaymentIntent(Long reservationId) {

        // 1. Trouver la réservation
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));

        // 2. Vérifier que la réservation est CONFIRMED
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new RuntimeException("La réservation doit être confirmée avant le paiement");
        }

        // 3. Vérifier que le contrat est SIGNED
        Contract contract = contractRepository.findByReservationId(reservationId)
                .orElseThrow(() -> new RuntimeException("Contrat non trouvé. Signez le contrat d'abord."));

        if (contract.getStatus() != ContractStatus.SIGNED) {
            throw new RuntimeException("Le contrat doit être signé avant le paiement");
        }

        // 4. Vérifier qu'il n'y a pas déjà un paiement complété
        paymentRepository.findByReservationId(reservationId).ifPresent(existingPayment -> {
            if (existingPayment.getStatus() == PaymentStatus.COMPLETED) {
                throw new RuntimeException("Cette réservation est déjà payée");
            }
        });

        try {
            // 5. Créer le PaymentIntent chez Stripe
            long amountInCents = reservation.getTotalAmount().longValue() * 100;

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency("eur")
                    .putMetadata("reservation_id", reservationId.toString())
                    .setDescription("Location " + reservation.getCar().getBrand() + " " +
                            reservation.getCar().getModel() + " | " +
                            reservation.getStartDate() + " → " + reservation.getEndDate())
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);

            // 6. Sauvegarder le paiement en base
            Payment payment = new Payment();
            payment.setExternalPaymentId(paymentIntent.getId());
            payment.setAmount(reservation.getTotalAmount());
            payment.setCurrency("EUR");
            payment.setProvider("STRIPE");
            payment.setStatus(PaymentStatus.PENDING);
            payment.setReservation(reservation);
            paymentRepository.save(payment);
            sseService.createAndSend(reservation.getClient().getId(),
                    "Paiement en cours 💳",
                    "Votre paiement de " + reservation.getTotalAmount() + "€ est en cours.",
                    "PAYMENT");

            // 7. Retourner le clientSecret au frontend
            return PaymentIntentResponse.builder()
                    .clientSecret(paymentIntent.getClientSecret())
                    .paymentIntentId(paymentIntent.getId())
                    .paymentId(payment.getId())
                    .build();

        } catch (com.stripe.exception.StripeException e) {
            throw new RuntimeException("Erreur Stripe : " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public void handleWebhook(String payload, String signature) {
        try {
            Event event = Webhook.constructEvent(payload, signature, webhookSecret);
            System.out.println("🔔 Webhook reçu : " + event.getType());

            switch (event.getType()) {
                case "payment_intent.succeeded" -> {
                    PaymentIntent intent = (PaymentIntent) event.getDataObjectDeserializer()
                            .getObject().orElse(null);
                    if (intent != null) {
                        updatePaymentStatus(intent.getId(), PaymentStatus.COMPLETED);
                    }
                }
                case "payment_intent.payment_failed" -> {
                    PaymentIntent intent = (PaymentIntent) event.getDataObjectDeserializer()
                            .getObject().orElse(null);
                    if (intent != null) {
                        updatePaymentStatus(intent.getId(), PaymentStatus.FAILED);
                    }
                }
                default -> {
                    System.out.println("ℹ️ Événement ignoré : " + event.getType());
                }
            }
        } catch (SignatureVerificationException e) {
            throw new RuntimeException("Signature webhook invalide");
        }
    }

    private void updatePaymentStatus(String paymentIntentId, PaymentStatus status) {
        System.out.println("🔍 Recherche paiement : " + paymentIntentId);

        // 1️⃣ Chercher par external_payment_id
        Optional<Payment> paymentOpt = paymentRepository.findByExternalPaymentId(paymentIntentId);

        if (paymentOpt.isPresent()) {
            Payment payment = paymentOpt.get();
            System.out.println("✅ Trouvé par externalPaymentId : " + payment.getId());
            updatePayment(payment, status);
        } else {
            // 2️⃣ Fallback : dernier paiement PENDING
            System.out.println("❌ Non trouvé, recherche du dernier PENDING...");

            Optional<Payment> lastPending = paymentRepository
                    .findTopByStatusOrderByCreatedAtDesc(PaymentStatus.PENDING);

            if (lastPending.isPresent()) {
                Payment payment = lastPending.get();
                System.out.println("✅ Dernier PENDING trouvé : " + payment.getId());
                payment.setExternalPaymentId(paymentIntentId);
                updatePayment(payment, status);
            } else {
                System.out.println("❌ Aucun paiement PENDING trouvé !");
            }
        }
    }

    private void updatePayment(Payment payment, PaymentStatus status) {
        // Mettre à jour le statut
        payment.setStatus(status);

        if (status == PaymentStatus.COMPLETED) {
            payment.setPaymentDate(LocalDateTime.now());
            System.out.println("✅ Paiement COMPLETED pour : " + payment.getExternalPaymentId());

            // 🔔 Notification au client (si la réservation existe)
            if (payment.getReservation() != null && payment.getReservation().getClient() != null) {
                sseService.createAndSend(
                        payment.getReservation().getClient().getId(),
                        "Paiement accepté ✅",
                        "Votre paiement de " + payment.getAmount() + "€ a été accepté.",
                        "PAYMENT"
                );
            }
        } else if (status == PaymentStatus.FAILED) {
            System.out.println("❌ Paiement FAILED pour : " + payment.getExternalPaymentId());
        }

        paymentRepository.save(payment);
        System.out.println("✅ Statut mis à jour : " + status);
    }

    @Override
    public PaymentResponse getPaymentByReservation(Long reservationId) {
        Payment payment = paymentRepository.findByReservationId(reservationId)
                .orElseThrow(() -> new RuntimeException("Aucun paiement trouvé pour cette réservation"));
        return paymentMapper.toResponse(payment);
    }

    @Override
    public List<PaymentResponse> getAllPayments() {
        return paymentRepository.findAll()
                .stream()
                .map(paymentMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MessageResponse refundPayment(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Paiement non trouvé"));

        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            return MessageResponse.error("Seul un paiement complété peut être remboursé");
        }

        try {
            // Rembourser via Stripe
            com.stripe.model.Refund.create(
                    com.stripe.param.RefundCreateParams.builder()
                            .setPaymentIntent(payment.getExternalPaymentId())
                            .build()
            );

            payment.setStatus(PaymentStatus.REFUNDED);
            paymentRepository.save(payment);

            // Libérer la voiture
            Reservation reservation = payment.getReservation();
            reservation.setStatus(ReservationStatus.CANCELLED);
            reservation.getCar().setStatus(CarStatus.AVAILABLE);
            carRepository.save(reservation.getCar());
            reservationRepository.save(reservation);

            return MessageResponse.success("Remboursement effectué avec succès");

        } catch (Exception e) {
            return MessageResponse.error("Erreur lors du remboursement : " + e.getMessage());
        }
    }
}