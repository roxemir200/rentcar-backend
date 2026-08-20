package com.rentcar.rent_car.service.imp;

import com.rentcar.rent_car.dto.mapper.ContractMapper;
import com.rentcar.rent_car.dto.response.ContractResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Contract;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.ContractStatus;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.ContractRepository;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.service.ContractService;
import com.rentcar.rent_car.service.SseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContractServiceImpl implements ContractService {
    private final SseService sseService;
    private final ContractRepository contractRepository;
    private final ReservationRepository reservationRepository;
    private final UserRepository userRepository;
    private final ContractMapper contractMapper;

    @Override
    @Transactional
    public MessageResponse generateContract(Long reservationId) {

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));

        // Vérifier que la réservation est confirmée
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            return MessageResponse.error("La réservation doit être confirmée avant de générer un contrat");
        }

        // Vérifier qu'un contrat n'existe pas déjà
        if (contractRepository.existsByReservationId(reservationId)) {
            return MessageResponse.error("Un contrat existe déjà pour cette réservation");
        }

        // Générer le contrat
        String contractNumber = generateContractNumber();
        String terms = generateTerms(reservation, contractNumber);

        Contract contract = new Contract();
        contract.setContractNumber(contractNumber);
        contract.setTerms(terms);
        contract.setPdfUrl("/api/contracts/" + contractNumber + ".pdf");
        contract.setStatus(ContractStatus.DRAFT);
        contract.setReservation(reservation);

        contractRepository.save(contract);

        return MessageResponse.success(
                "Contrat généré avec succès. En attente de signature du client.",
                contractMapper.toResponse(contract));
    }


    @Override
    @Transactional
    public MessageResponse signContract(Long contractId, String clientEmail) {

        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Contrat non trouvé"));

        // Vérifications...
        if (contract.getStatus() == ContractStatus.SIGNED) {
            return MessageResponse.error("Ce contrat est déjà signé");
        }
        if (contract.getStatus() == ContractStatus.CANCELLED) {
            return MessageResponse.error("Ce contrat est annulé et ne peut pas être signé");
        }

        User client = userRepository.findByEmail(clientEmail)
                .orElseThrow(() -> new RuntimeException("Client non trouvé"));

        Long reservationClientId = contract.getReservation().getClient().getId();
        if (!reservationClientId.equals(client.getId())) {
            return MessageResponse.error("Vous n'êtes pas autorisé à signer ce contrat");
        }

        // Signer le contrat
        contract.setStatus(ContractStatus.SIGNED);
        contract.setSignedAt(LocalDateTime.now());
        contractRepository.save(contract);

        // L'intention de paiement n'est PLUS creee ici : elle l'est par la page
        // de paiement, via POST /api/payments/create-intent.
        //
        // L'appel depuis cette methode ne pouvait pas fonctionner.
        // createPaymentIntent() s'execute en REQUIRES_NEW -- donc sur une
        // transaction, et une connexion, distinctes -- et commence par relire
        // le contrat en base pour verifier qu'il est signe. Or le save()
        // ci-dessus n'est pas encore commite : la transaction independante
        // lisait invariablement l'ancien statut DRAFT et refusait de creer le
        // paiement (« Le contrat doit être signé avant le paiement »).
        //
        // L'echec etait rattrape et simplement journalise : la signature
        // paraissait reussie, mais aucun paiement n'existait, et le client
        // n'avait plus aucun moyen de payer -- re-signer etant refuse.
        //
        // Les tests unitaires ne l'ont pas vu : ils substituent PaymentService
        // par un double, ce qui supprime justement la lecture en base.
        Reservation reservation = contract.getReservation();

        // Notifications...
        sseService.createAndSend(reservation.getClient().getId(),
                "Contrat signé ✅",
                "Vous avez signé le contrat. Vous pouvez maintenant procéder au paiement.",
                "CONTRACT");

        List<User> admins = userRepository.findByRole(Role.ADMIN);
        for (User admin : admins) {
            sseService.createAndSend(admin.getId(),
                    "Contrat signé 📄",
                    client.getFirstName() + " " + client.getLastName() + " a signé le contrat " + contract.getContractNumber(),
                    "CONTRACT");
        }

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("contract", contractMapper.toResponse(contract));

        return MessageResponse.success(
                "Contrat signé avec succès ! Vous pouvez maintenant procéder au paiement.",
                responseData);
    }

    @Override
    public ContractResponse getContractByReservation(Long reservationId) {
        Contract contract = contractRepository.findByReservationId(reservationId)
                .orElseThrow(() -> new RuntimeException("Aucun contrat trouvé pour cette réservation"));
        return contractMapper.toResponse(contract);
    }

    @Override
    public ContractResponse getContractById(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Contrat non trouvé"));
        return contractMapper.toResponse(contract);
    }

    @Override
    public List<ContractResponse> getAllContracts() {
        return contractRepository.findAll()
                .stream()
                .map(contractMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ========== MÉTHODES PRIVÉES ==========

    private String generateContractNumber() {
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String random = String.format("%04d", (int) (Math.random() * 9999));
        return "CONT-" + date + "-" + random;
    }

    private String generateTerms(Reservation r, String contractNumber) {
        Car car = r.getCar();
        long days = ChronoUnit.DAYS.between(r.getStartDate(), r.getEndDate());

        return """
            ╔══════════════════════════════════════════════════════════════╗
            ║              CONTRAT DE LOCATION DE VÉHICULE                  ║
            ╚══════════════════════════════════════════════════════════════╝
            
            Numéro de contrat : %s
            Date d'émission : %s
            
            ─────────────────────────────────────────────────────────────
            1. INFORMATIONS DU CLIENT
            ─────────────────────────────────────────────────────────────
            Nom complet : %s %s
            Email : %s
            
            ─────────────────────────────────────────────────────────────
            2. VÉHICULE CONCERNÉ
            ─────────────────────────────────────────────────────────────
            Marque : %s
            Modèle : %s
            Immatriculation : %s
            Couleur : %s
            Kilométrage actuel : %d km
            Type de carburant : %s
            Transmission : %s
            Nombre de places : %d
            
            ─────────────────────────────────────────────────────────────
            3. DÉTAILS DE LA LOCATION
            ─────────────────────────────────────────────────────────────
            Date de début : %s
            Date de fin : %s
            Durée : %d jour(s)
            Lieu de prise en charge : %s
            Lieu de restitution : %s
            Tarif journalier : %.2f €
            Montant total TTC : %.2f €
            
            ─────────────────────────────────────────────────────────────
            4. CONDITIONS GÉNÉRALES
            ─────────────────────────────────────────────────────────────
            4.1. Le locataire s'engage à restituer le véhicule dans
                 l'état où il l'a reçu.
            4.2. Le carburant doit être restitué au même niveau qu'au
                 départ. Tout manquement entraînera des frais.
            4.3. Le locataire est responsable des contraventions
                 durant la période de location.
            4.4. Tout dommage constaté au retour sera facturé
                 selon le barème en vigueur.
            4.5. Le kilométrage illimité est inclus sauf mention
                 contraire.
            4.6. En cas de retard de restitution, des frais
                 supplémentaires de 50€ par jour seront appliqués.
            4.7. Le véhicule ne peut pas être utilisé en dehors
                 du territoire national sans autorisation.
            4.8. Un état des lieux contradictoire sera établi au
                 moment de la prise en charge et au retour.
            
            ─────────────────────────────────────────────────────────────
            5. SIGNATURES
            ─────────────────────────────────────────────────────────────
            
            L'agence (Loueur) :
            RentCar - Location de véhicules
            ✅ Signé électroniquement
            
            Le locataire (Client) :
            Nom : %s %s
            %s
            
            ─────────────────────────────────────────────────────────────
            """.formatted(
                contractNumber,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")),
                r.getClient().getFirstName(),
                r.getClient().getLastName(),
                r.getClient().getEmail(),
                car.getBrand(),
                car.getModel(),
                car.getRegistrationNumber(),
                car.getColor() != null ? car.getColor() : "Non spécifiée",
                car.getMileage(),
                car.getFuelType().name(),
                car.getTransmission().name(),
                car.getSeats(),
                r.getStartDate(),
                r.getEndDate(),
                days,
                r.getPickupLocation() != null ? r.getPickupLocation() : "Agence principale",
                r.getReturnLocation() != null ? r.getReturnLocation() : "Agence principale",
                r.getPricePerDaySnapshot(),
                r.getTotalAmount(),
                r.getClient().getFirstName(),
                r.getClient().getLastName(),
                r.getStatus() == ReservationStatus.CONFIRMED && contractNumber != null
                        && contractRepository.findByReservationId(r.getId())
                        .map(c -> c.getStatus() == ContractStatus.SIGNED).orElse(false)
                        ? "✅ Signé le " + contractRepository.findByReservationId(r.getId())
                        .get().getSignedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm"))
                        : "⏳ En attente de signature"
        );
    }
    @Override
    @Transactional
    public MessageResponse cancelContract(Long contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Contrat non trouvé"));

        // Vérifier que le contrat n'est pas déjà annulé
        if (contract.getStatus() == ContractStatus.CANCELLED) {
            return MessageResponse.error("Ce contrat est déjà annulé");
        }

        // Vérifier que le contrat n'est pas déjà signé ET la location en cours
        if (contract.getStatus() == ContractStatus.SIGNED) {
            Reservation reservation = contract.getReservation();
            if (reservation.getStatus() == ReservationStatus.IN_PROGRESS ||
                    reservation.getStatus() == ReservationStatus.COMPLETED) {
                return MessageResponse.error("Impossible d'annuler un contrat dont la location est en cours ou terminée");
            }
        }

        // Annuler le contrat
        contract.setStatus(ContractStatus.CANCELLED);
        contractRepository.save(contract);
        sseService.createAndSend(
                contract.getReservation().getClient().getId(),
                "Contrat annulé ❌",
                "Le contrat a été annulé. La réservation est maintenant annulée.",
                "CONTRACT"
        );

        return MessageResponse.success("Contrat annulé avec succès");
    }
}