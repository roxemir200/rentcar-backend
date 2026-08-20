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
import com.rentcar.rent_car.exception.ResourceNotFoundException;
import com.stripe.exception.AuthenticationException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j  // ✅ Ajout de @Slf4j pour les logs structurés
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

    /**
     * Transaction independante de l'appelant, volontairement.
     * <p>
     * Avec la propagation par defaut, cette methode rejoignait la transaction
     * de {@code ContractServiceImpl.signContract}. Un echec Stripe y levait
     * une exception qui, en franchissant la frontiere transactionnelle,
     * marquait la transaction entiere « rollback-only ». L'appelant avait beau
     * rattraper l'exception, le commit final echouait en
     * {@code UnexpectedRollbackException} : la signature du contrat etait
     * perdue, et le client recevait un 500 apres un message de succes.
     * <p>
     * Signer un contrat et creer une intention de paiement sont deux
     * operations distinctes : l'indisponibilite du prestataire de paiement ne
     * doit pas annuler la signature.
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PaymentIntentResponse createPaymentIntent(Long reservationId) {
        log.info("Début de createPaymentIntent() pour réservation ID : {}", reservationId);

        // 1. Trouver la réservation
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> {
                    log.error("Réservation non trouvée avec ID : {}", reservationId);
                    return new RuntimeException("Réservation non trouvée");
                });
        log.info("Réservation trouvée : {}", reservation.getId());

        // 2. Vérifier que la réservation est CONFIRMED
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            log.warn("Réservation {} non confirmée, statut : {}", reservationId, reservation.getStatus());
            throw new RuntimeException("La réservation doit être confirmée avant le paiement");
        }

        // 3. Vérifier que le contrat est SIGNED
        Contract contract = contractRepository.findByReservationId(reservationId)
                .orElseThrow(() -> {
                    log.error("Contrat non trouvé pour la réservation : {}", reservationId);
                    return new RuntimeException("Contrat non trouvé. Signez le contrat d'abord.");
                });
        log.info("Contrat trouvé, statut : {}", contract.getStatus());

        if (contract.getStatus() != ContractStatus.SIGNED) {
            log.warn("Contrat non signé pour la réservation : {}", reservationId);
            throw new RuntimeException("Le contrat doit être signé avant le paiement");
        }

        // 4. Reprendre le paiement existant plutot que d'en creer un second.
        //
        // Une reservation ne porte qu'un paiement. Inserer une ligne neuve a
        // chaque tentative en laissait plusieurs au statut PENDING pour la
        // meme reservation ; le repli « dernier PENDING » de
        // updatePaymentStatus() pouvait alors valider la mauvaise.
        Payment existingPayment = paymentRepository.findByReservationId(reservationId).orElse(null);
        if (existingPayment != null) {
            log.info("Paiement existant trouvé, statut : {}", existingPayment.getStatus());
            if (existingPayment.getStatus() == PaymentStatus.COMPLETED) {
                log.warn("Réservation déjà payée : {}", reservationId);
                throw new RuntimeException("Cette réservation est déjà payée");
            }
            log.info("Reprise du paiement {} : une nouvelle intention Stripe lui sera rattachée",
                    existingPayment.getId());
        }

        try {
            // 5. Créer le PaymentIntent chez Stripe
            long amountInCents = reservation.getTotalAmount().longValue() * 100;
            log.info("Création du PaymentIntent Stripe pour la réservation : {}", reservationId);

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency("eur")
                    .putMetadata("reservation_id", reservationId.toString())
                    .setDescription("Location " + reservation.getCar().getBrand() + " " +
                            reservation.getCar().getModel() + " | " +
                            reservation.getStartDate() + " → " + reservation.getEndDate())
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);
            
            // ✅ Log sécurisé (pas de clientSecret)
            log.info("PaymentIntent créé avec succès, ID : {}", paymentIntent.getId());

            // 6. Sauvegarder le paiement en base
            Payment payment = existingPayment != null ? existingPayment : new Payment();
            payment.setExternalPaymentId(paymentIntent.getId());
            payment.setAmount(reservation.getTotalAmount());
            payment.setCurrency("EUR");
            payment.setProvider("STRIPE");
            payment.setStatus(PaymentStatus.PENDING);
            payment.setReservation(reservation);
            
            Payment savedPayment = paymentRepository.save(payment);
            log.info("Paiement sauvegardé en base, ID paiement : {}", savedPayment.getId());

            // 7. Retourner le clientSecret au frontend
            PaymentIntentResponse response = PaymentIntentResponse.builder()
                    .clientSecret(paymentIntent.getClientSecret())
                    .paymentIntentId(paymentIntent.getId())
                    .paymentId(savedPayment.getId())
                    .build();
            
            log.info("Fin de createPaymentIntent() avec succès pour la réservation : {}", reservationId);
            return response;

        } catch (AuthenticationException e) {
            // Panne de configuration, pas incident passager : reessayer ne
            // changera rien. Le message generique « Veuillez réessayer »
            // invitait le client a s'acharner sur un bouton sans issue, et
            // masquait la seule action utile -- renseigner la cle sur
            // l'hebergeur.
            log.error("Clé secrète Stripe absente ou invalide : vérifiez STRIPE_SECRET_KEY "
                    + "sur l'hébergeur (valeur seule, sans nom de variable ni guillemets), "
                    + "puis redéployez. Réservation concernée : {}", reservationId, e);
            throw new RuntimeException(
                    "Le paiement est indisponible : la configuration Stripe du serveur est incomplète. "
                            + "Contactez l'agence.");
        } catch (StripeException e) {
            // ✅ Log sécurisé (pas de détails d'erreur Stripe)
            log.error("Erreur Stripe lors de la création du PaymentIntent pour la réservation : {}", reservationId, e);
            // ✅ Message générique pour le client
            throw new RuntimeException("Erreur lors du traitement du paiement. Veuillez réessayer.");
        }
    }

    @Override
    @Transactional
    public void handleWebhook(String payload, String signature) {
        log.info("Début de handleWebhook()");
        try {
            Event event = Webhook.constructEvent(payload, signature, webhookSecret);
            log.info("Webhook reçu : {}", event.getType());

            // Get the raw JSON data from the event
            String rawJson = event.getDataObjectDeserializer().getRawJson();
            log.debug("Raw JSON data reçu");

            // Parse the raw JSON to extract the PaymentIntent ID
            JsonNode jsonNode = objectMapper.readTree(rawJson);
            String paymentIntentId = jsonNode.get("id").asText();
            log.info("PaymentIntent ID extrait : {}", paymentIntentId);

            switch (event.getType()) {
                case "payment_intent.succeeded" -> {
                    log.info("Traitement de payment_intent.succeeded");
                    updatePaymentStatus(paymentIntentId, PaymentStatus.COMPLETED);
                }
                case "payment_intent.payment_failed" -> {
                    log.info("Traitement de payment_intent.payment_failed");
                    updatePaymentStatus(paymentIntentId, PaymentStatus.FAILED);
                }
                default -> log.info("Événement ignoré : {}", event.getType());
            }
            log.info("Fin de handleWebhook() avec succès");
        } catch (SignatureVerificationException e) {
            // ✅ Log sécurisé sans exposer les détails
            log.error("Erreur de signature webhook", e);
            throw new RuntimeException("Signature webhook invalide");
        } catch (Exception e) {
            // ✅ Log sécurisé sans exposer les détails
            log.error("Erreur inattendue dans handleWebhook", e);
            throw new RuntimeException("Erreur interne du serveur");
        }
    }

    private void updatePaymentStatus(String paymentIntentId, PaymentStatus status) {
        log.info("Début de updatePaymentStatus() pour : {}", paymentIntentId);

        log.info("Recherche par externalPaymentId : {}", paymentIntentId);
        Optional<Payment> paymentOpt = paymentRepository.findByExternalPaymentId(paymentIntentId);

        if (paymentOpt.isPresent()) {
            Payment payment = paymentOpt.get();
            log.info("Trouvé par externalPaymentId, ID paiement : {}", payment.getId());
            log.info("Statut actuel du paiement : {}", payment.getStatus());
            updatePayment(payment, status);
        } else {
            log.warn("Non trouvé par externalPaymentId, recherche du dernier PENDING...");
            Optional<Payment> lastPending = paymentRepository
                    .findTopByStatusOrderByCreatedAtDesc(PaymentStatus.PENDING);

            if (lastPending.isPresent()) {
                Payment payment = lastPending.get();
                log.info("Dernier PENDING trouvé, ID paiement : {}", payment.getId());
                log.info("externalPaymentId actuel : {}", payment.getExternalPaymentId());
                payment.setExternalPaymentId(paymentIntentId);
                updatePayment(payment, status);
            } else {
                log.warn("Aucun paiement PENDING trouvé !");
            }
        }
        log.info("Fin de updatePaymentStatus()");
    }

    private void updatePayment(Payment payment, PaymentStatus status) {
        log.info("Début de updatePayment() pour paiement ID: {}", payment.getId());

        payment.setStatus(status);

        if (status == PaymentStatus.COMPLETED) {
            payment.setPaymentDate(LocalDateTime.now());
            log.info("Statut passé à COMPLETED, paymentDate défini");
        } else if (status == PaymentStatus.FAILED) {
            log.info("Statut passé à FAILED");
        }

        log.info("Sauvegarde du paiement dans la base de données");
        Payment savedPayment = paymentRepository.save(payment);
        log.info("Paiement sauvegardé, nouveau statut: {}", savedPayment.getStatus());
        log.info("paymentDate: {}", savedPayment.getPaymentDate());

        Reservation reservation = payment.getReservation();

        // 🔔 Envoyer l'événement SSE de mise à jour du paiement
        if (reservation != null && reservation.getClient() != null) {
            PaymentResponse paymentResponse = paymentMapper.toResponse(savedPayment);
            sseService.sendEvent(
                    reservation.getClient().getId(),
                    "payment.updated",
                    paymentResponse
            );

            sseService.sendEventToAllAdmins("payment.updated", paymentResponse);

            if (status == PaymentStatus.COMPLETED) {
                sseService.createAndSend(
                        reservation.getClient().getId(),
                        "Paiement accepté ✅",
                        "Votre paiement de " + payment.getAmount() + "€ a été accepté.",
                        "PAYMENT"
                );

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
        log.info("Fin de updatePayment()");
    }

    @Override
    public PaymentResponse getPaymentByReservation(Long reservationId) {
        Payment payment = paymentRepository.findByReservationId(reservationId)
                .orElseThrow(() -> {
                    log.info("Aucun paiement pour la réservation {} : le client n'a pas encore engagé le règlement", reservationId);
                    return new ResourceNotFoundException("Aucun paiement trouvé pour cette réservation");
                });
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
        // ✅ Validation de l'email
        if (clientEmail == null || clientEmail.isBlank()) {
            log.error("Email client null ou vide");
            throw new RuntimeException("Email client invalide");
        }

        com.rentcar.rent_car.entity.User client = userRepository.findByEmail(clientEmail)
                .orElseThrow(() -> {
                    log.error("Client non trouvé avec email : {}", clientEmail);
                    return new RuntimeException("Client non trouvé");
                });
        
        log.info("Client found: {}", client.getId());
        List<com.rentcar.rent_car.entity.Payment> payments = paymentRepository.findByReservationClientId(client.getId());
        log.info("Found {} payments for client: {}", payments.size(), client.getId());
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
        log.info("Début de refundPayment() pour paiement ID: {}", paymentId);
        
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> {
                    log.error("Paiement non trouvé avec ID : {}", paymentId);
                    return new IllegalArgumentException("Paiement non trouvé");
                });
        
        Reservation reservation = payment.getReservation();
        if (reservation == null) {
            log.warn("Paiement {} sans réservation associée", paymentId);
            return MessageResponse.error("Ce paiement n'est lié à aucune réservation");
        }

        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            log.warn("Paiement {} déjà remboursé", paymentId);
            return MessageResponse.error("Ce paiement a déjà été remboursé");
        }

        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            log.warn("Paiement {} non complété", paymentId);
            return MessageResponse.error("Seul un paiement complété peut être remboursé");
        }

        ReservationStatus resStatus = reservation.getStatus();
        if (resStatus == ReservationStatus.IN_PROGRESS) {
            log.warn("Réservation {} en cours, impossible de rembourser", reservation.getId());
            return MessageResponse.error("Impossible de rembourser une location en cours");
        }
        if (resStatus == ReservationStatus.COMPLETED) {
            log.warn("Réservation {} terminée, impossible de rembourser", reservation.getId());
            return MessageResponse.error("Une réservation terminée ne peut pas être remboursée");
        }
        if (resStatus == ReservationStatus.CANCELLED) {
            log.warn("Réservation {} déjà annulée", reservation.getId());
            return MessageResponse.error("Cette réservation est déjà annulée");
        }

        String externalPaymentId = payment.getExternalPaymentId();
        if (externalPaymentId == null || externalPaymentId.isBlank()) {
            log.warn("Paiement {} sans externalPaymentId", paymentId);
            return MessageResponse.error("Identifiant Stripe introuvable pour ce paiement — remboursement impossible");
        }

        try {
            com.stripe.model.Refund.create(
                    com.stripe.param.RefundCreateParams.builder()
                            .setPaymentIntent(externalPaymentId)
                            .build()
            );
            log.info("Remboursement Stripe réussi pour paiement : {}", paymentId);
        } catch (Exception e) {
            // ✅ Log sécurisé sans exposer les détails Stripe
            log.error("Erreur lors du remboursement Stripe pour paiement : {}", paymentId, e);
            return MessageResponse.error("Échec du remboursement. Veuillez contacter le support.");
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

        log.info("Fin de refundPayment() avec succès pour paiement : {}", paymentId);
        return MessageResponse.success("Remboursement effectué avec succès");
    }
}