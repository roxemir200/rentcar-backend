package com.rentcar.rent_car.service.imp;

import com.rentcar.rent_car.entity.*;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.rentcar.rent_car.dto.mapper.CarMapper;
import com.rentcar.rent_car.dto.mapper.PaymentMapper;
import com.rentcar.rent_car.dto.mapper.ReservationMapper;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.dto.response.ReservationResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.PaymentIntentResponse;
import com.rentcar.rent_car.dto.response.PaymentResponse;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.ContractStatus;
import com.rentcar.rent_car.enums.PaymentStatus;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.ContractRepository;
import com.rentcar.rent_car.repository.PaymentRepository;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.repository.UserRepository;
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
    private final ObjectMapper objectMapper;

    private final PaymentRepository paymentRepository;
    private final ReservationRepository reservationRepository;
    private final ContractRepository contractRepository;
    private final CarRepository carRepository;
    private final UserRepository userRepository;
    private final PaymentMapper paymentMapper;
    private final ReservationMapper reservationMapper;
    private final CarMapper carMapper;

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    @Override
    @Transactional
    public PaymentIntentResponse createPaymentIntent(Long reservationId) {
        System.out.println("💰 Début de createPaymentIntent() pour réservation ID : " + reservationId);

        // 1. Trouver la réservation
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
        System.out.println("✅ Réservation trouvée : " + reservation.getId());

        // 2. Vérifier que la réservation est CONFIRMED
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new RuntimeException("La réservation doit être confirmée avant le paiement");
        }

        // 3. Vérifier que le contrat est SIGNED
        Contract contract = contractRepository.findByReservationId(reservationId)
                .orElseThrow(() -> new RuntimeException("Contrat non trouvé. Signez le contrat d'abord."));
        System.out.println("✅ Contrat trouvé, statut : " + contract.getStatus());

        if (contract.getStatus() != ContractStatus.SIGNED) {
            throw new RuntimeException("Le contrat doit être signé avant le paiement");
        }

        // 4. Vérifier qu'il n'y a pas déjà un paiement complété
        paymentRepository.findByReservationId(reservationId).ifPresent(existingPayment -> {
            System.out.println("ℹ️ Paiement existant trouvé, statut : " + existingPayment.getStatus());
            if (existingPayment.getStatus() == PaymentStatus.COMPLETED) {
                throw new RuntimeException("Cette réservation est déjà payée");
            }
        });

        try {
            // 5. Créer le PaymentIntent chez Stripe
            long amountInCents = reservation.getTotalAmount().longValue() * 100;
            System.out.println("💰 Création du PaymentIntent Stripe, montant en centimes : " + amountInCents);

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency("eur")
                    .putMetadata("reservation_id", reservationId.toString())
                    .setDescription("Location " + reservation.getCar().getBrand() + " " +
                            reservation.getCar().getModel() + " | " +
                            reservation.getStartDate() + " → " + reservation.getEndDate())
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);
            System.out.println("✅ PaymentIntent créé, ID : " + paymentIntent.getId());
            System.out.println("✅ Client secret : " + paymentIntent.getClientSecret());

            // 6. Sauvegarder le paiement en base
            Payment payment = new Payment();
            payment.setExternalPaymentId(paymentIntent.getId());
            payment.setAmount(reservation.getTotalAmount());
            payment.setCurrency("EUR");
            payment.setProvider("STRIPE");
            payment.setStatus(PaymentStatus.PENDING);
            payment.setReservation(reservation);
            Payment savedPayment = paymentRepository.save(payment);
            System.out.println("✅ Paiement sauvegardé en base, ID paiement : " + savedPayment.getId());
            System.out.println("✅ externalPaymentId sauvegardé : " + savedPayment.getExternalPaymentId());

            // 7. Retourner le clientSecret au frontend
            PaymentIntentResponse response = PaymentIntentResponse.builder()
                    .clientSecret(paymentIntent.getClientSecret())
                    .paymentIntentId(paymentIntent.getId())
                    .paymentId(payment.getId())
                    .build();
            System.out.println("💰 Fin de createPaymentIntent() avec succès");
            return response;

        } catch (com.stripe.exception.StripeException e) {
            System.out.println("❌ Erreur Stripe : " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erreur Stripe : " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public void handleWebhook(String payload, String signature) {
        System.out.println("🔔 Début de handleWebhook()");
        try {
            Event event = Webhook.constructEvent(payload, signature, webhookSecret);
            System.out.println("🔔 Webhook reçu : " + event.getType());

            // Get the raw JSON data from the event
            String rawJson = event.getDataObjectDeserializer().getRawJson();
            System.out.println("📄 Raw JSON data: " + rawJson);

            // Parse the raw JSON to extract the PaymentIntent ID
            JsonNode jsonNode = objectMapper.readTree(rawJson);
            String paymentIntentId = jsonNode.get("id").asText();
            System.out.println("🔔 Extracted PaymentIntent ID: " + paymentIntentId);

            switch (event.getType()) {
                case "payment_intent.succeeded" -> {
                    System.out.println("🔔 Traitement de payment_intent.succeeded");
                    updatePaymentStatus(paymentIntentId, PaymentStatus.COMPLETED);
                }
                case "payment_intent.payment_failed" -> {
                    System.out.println("🔔 Traitement de payment_intent.payment_failed");
                    updatePaymentStatus(paymentIntentId, PaymentStatus.FAILED);
                }
                default -> {
                    System.out.println("ℹ️ Événement ignoré : " + event.getType());
                }
            }
            System.out.println("🔔 Fin de handleWebhook() avec succès");
        } catch (SignatureVerificationException e) {
            System.out.println("❌ Erreur de signature webhook : " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Signature webhook invalide");
        } catch (Exception e) {
            System.out.println("❌ Erreur inattendue dans handleWebhook : " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erreur inattendue dans le traitement du webhook", e);
        }
    }

    private void updatePaymentStatus(String paymentIntentId, PaymentStatus status) {
        System.out.println("🔍 Début de updatePaymentStatus() pour : " + paymentIntentId);

        // 1️⃣ Chercher par external_payment_id
        System.out.println("🔍 Recherche par externalPaymentId : " + paymentIntentId);
        Optional<Payment> paymentOpt = paymentRepository.findByExternalPaymentId(paymentIntentId);

        if (paymentOpt.isPresent()) {
            Payment payment = paymentOpt.get();
            System.out.println("✅ Trouvé par externalPaymentId, ID paiement : " + payment.getId());
            System.out.println("✅ Statut actuel du paiement : " + payment.getStatus());
            updatePayment(payment, status);
        } else {
            System.out.println("❌ Non trouvé par externalPaymentId, recherche du dernier PENDING...");

            Optional<Payment> lastPending = paymentRepository
                    .findTopByStatusOrderByCreatedAtDesc(PaymentStatus.PENDING);

            if (lastPending.isPresent()) {
                Payment payment = lastPending.get();
                System.out.println("✅ Dernier PENDING trouvé, ID paiement : " + payment.getId());
                System.out.println("✅ externalPaymentId actuel : " + payment.getExternalPaymentId());
                payment.setExternalPaymentId(paymentIntentId);
                updatePayment(payment, status);
            } else {
                System.out.println("❌ Aucun paiement PENDING trouvé !");
            }
        }
        System.out.println("🔍 Fin de updatePaymentStatus()");
    }

    private void updatePayment(Payment payment, PaymentStatus status) {
        System.out.println("🔧 Début de updatePayment() pour paiement ID: " + payment.getId());
        // Mettre à jour le statut
        payment.setStatus(status);

        if (status == PaymentStatus.COMPLETED) {
            payment.setPaymentDate(LocalDateTime.now());
            System.out.println("✅ Statut passé à COMPLETED, paymentDate défini");
        } else if (status == PaymentStatus.FAILED) {
            System.out.println("❌ Statut passé à FAILED");
        }

        System.out.println("💾 Sauvegarde du paiement dans la base de données");
        Payment savedPayment = paymentRepository.save(payment);
        System.out.println("✅ Paiement sauvegardé, nouveau statut: " + savedPayment.getStatus());
        System.out.println("✅ paymentDate: " + savedPayment.getPaymentDate());

        Reservation reservation = payment.getReservation();

        // 🔔 Envoyer l'événement SSE de mise à jour du paiement
        if (reservation != null && reservation.getClient() != null) {
            PaymentResponse paymentResponse = paymentMapper.toResponse(savedPayment);
            sseService.sendEvent(
                    reservation.getClient().getId(),
                    "payment.updated",
                    paymentResponse
            );

            // 🔔 Notifier aussi les admins
            sseService.sendEventToAllAdmins("payment.updated", paymentResponse);

            if (status == PaymentStatus.COMPLETED) {
                // Le paiement est confirmé : envoyer une notification SUCCES + propager les updates
                sseService.createAndSend(
                        reservation.getClient().getId(),
                        "Paiement accepté ✅",
                        "Votre paiement de " + payment.getAmount() + "€ a été accepté.",
                        "PAYMENT"
                );

                // 🔔 Notifier TOUS les admins : paiement reçu avec détails client + véhicule
                String clientFullName = reservation.getClient().getFirstName() + " " + reservation.getClient().getLastName();
                String carLabel = reservation.getCar().getBrand() + " " + reservation.getCar().getModel();
                List<User> admins = userRepository.findByRole(com.rentcar.rent_car.enums.Role.ADMIN);
                for (User admin : admins) {
                    sseService.createAndSend(
                            admin.getId(),
                            "Paiement reçu ✅",
                            clientFullName + " a réglé " + payment.getAmount() + "€ pour la réservation #" + reservation.getId() + " (" + carLabel + ").",
                            "PAYMENT"
                    );
                }

                // Diffuser la mise à jour de la réservation (les listes doivent re-rendre)
                ReservationResponse resDto = reservationMapper.toResponse(reservation);
                sseService.sendEvent(reservation.getClient().getId(), "reservation.updated", resDto);
                sseService.sendEventToAllAdmins("reservation.updated", resDto);
            } else if (status == PaymentStatus.FAILED) {
                sseService.createAndSend(
                        reservation.getClient().getId(),
                        "Paiement échoué ❌",
                        "Votre paiement de " + payment.getAmount() + "€ n'a pas pu être traité. Merci de réessayer.",
                        "PAYMENT"
                );
                String clientFullName = reservation.getClient().getFirstName() + " " + reservation.getClient().getLastName();
                List<User> admins = userRepository.findByRole(com.rentcar.rent_car.enums.Role.ADMIN);
                for (User admin : admins) {
                    sseService.createAndSend(
                            admin.getId(),
                            "Paiement échoué ❌",
                            "Le paiement de " + clientFullName + " (" + payment.getAmount() + "€) pour la réservation #" + reservation.getId() + " a échoué.",
                            "PAYMENT"
                    );
                }
            }
        }

        System.out.println("🔧 Fin de updatePayment()");
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
    public List<PaymentResponse> getPaymentsByCurrentUser(String clientEmail) {
        com.rentcar.rent_car.entity.User client = userRepository.findByEmail(clientEmail)
                .orElseThrow(() -> new RuntimeException("Client non trouvé"));
        System.out.println("Client found: " + client.getId() + ", " + client.getEmail());
        List<com.rentcar.rent_car.entity.Payment> payments = paymentRepository.findByReservationClientId(client.getId());
        System.out.println("Found " + payments.size() + " payments for client: " + client.getId());
        return payments.stream().map(paymentMapper::toResponse).collect(Collectors.toList());
    }

    private void broadcastReservationUpdate(Reservation reservation) {
        ReservationResponse dto = reservationMapper.toResponse(reservation);
        if (reservation.getClient() != null) {
            sseService.sendEvent(reservation.getClient().getId(), "reservation.updated", dto);
        }
        sseService.sendEventToAllAdmins("reservation.updated", dto);
    }

    private void broadcastCarUpdate(Car car) {
        CarResponse dto = carMapper.toResponse(car);
        sseService.sendEventToAllAdmins("car.updated", dto);
        userRepository.findByIsActiveTrue().forEach(user ->
                sseService.sendEvent(user.getId(), "car.updated", dto)
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MessageResponse refundPayment(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Paiement non trouvé"));

        Reservation reservation = payment.getReservation();
        if (reservation == null) {
            return MessageResponse.error("Ce paiement n'est lié à aucune réservation");
        }

        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            return MessageResponse.error("Ce paiement a déjà été remboursé");
        }

        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            return MessageResponse.error("Seul un paiement complété peut être remboursé");
        }

        ReservationStatus resStatus = reservation.getStatus();
        if (resStatus == ReservationStatus.IN_PROGRESS) {
            return MessageResponse.error("Impossible de rembourser une location en cours");
        }
        if (resStatus == ReservationStatus.COMPLETED) {
            return MessageResponse.error("Une réservation terminée ne peut pas être remboursée");
        }
        if (resStatus == ReservationStatus.CANCELLED) {
            return MessageResponse.error("Cette réservation est déjà annulée");
        }

        String externalPaymentId = payment.getExternalPaymentId();
        if (externalPaymentId == null || externalPaymentId.isBlank()) {
            return MessageResponse.error("Identifiant Stripe introuvable pour ce paiement — remboursement impossible");
        }

        try {
            com.stripe.model.Refund.create(
                    com.stripe.param.RefundCreateParams.builder()
                            .setPaymentIntent(externalPaymentId)
                            .build()
            );
        } catch (Exception e) {
            return MessageResponse.error("Échec du remboursement Stripe : " + e.getMessage());
        }

        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setPaymentDate(LocalDateTime.now());
        Payment savedPayment = paymentRepository.save(payment);

        reservation.setStatus(ReservationStatus.CANCELLED);
        Reservation savedReservation = reservationRepository.save(reservation);

        Car car = reservation.getCar();
        if (car != null) {
            car.setStatus(CarStatus.AVAILABLE);
            carRepository.save(car);
        }

        Contract contract = contractRepository.findByReservationId(reservation.getId()).orElse(null);
        if (contract != null && contract.getStatus() != ContractStatus.CANCELLED) {
            contract.setStatus(ContractStatus.CANCELLED);
            contractRepository.save(contract);
        }

        PaymentResponse paymentDto = paymentMapper.toResponse(savedPayment);
        if (reservation.getClient() != null) {
            sseService.sendEvent(reservation.getClient().getId(), "payment.updated", paymentDto);
        }
        sseService.sendEventToAllAdmins("payment.updated", paymentDto);

        broadcastReservationUpdate(savedReservation);
        if (car != null) {
            broadcastCarUpdate(car);
        }

        User client = reservation.getClient();
        Car carForLabel = reservation.getCar();
        String amountStr = savedPayment.getAmount() + " DT";
        String carLabel = carForLabel != null
                ? carForLabel.getBrand() + " " + carForLabel.getModel()
                : "véhicule";

        if (client != null) {
            sseService.createAndSend(
                    client.getId(),
                    "Remboursement effectué 💰",
                    "Votre paiement de " + amountStr + " pour la réservation #" + reservation.getId() + " (" + carLabel + ") a été remboursé.",
                    "PAYMENT"
            );
        }

        List<User> admins = userRepository.findByRole(com.rentcar.rent_car.enums.Role.ADMIN);
        String clientFullName = client != null
                ? client.getFirstName() + " " + client.getLastName()
                : "Client";
        for (User admin : admins) {
            sseService.createAndSend(
                    admin.getId(),
                    "Remboursement enregistré 💰",
                    clientFullName + " a été remboursé de " + amountStr + " — réservation #" + reservation.getId() + " (" + carLabel + ").",
                    "PAYMENT"
            );
        }

        return MessageResponse.success("Remboursement effectué avec succès");
    }
}