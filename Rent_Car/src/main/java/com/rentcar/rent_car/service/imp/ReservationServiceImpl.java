package com.rentcar.rent_car.service.impl;

import com.rentcar.rent_car.entity.Payment;
import com.rentcar.rent_car.enums.PaymentStatus;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.PaymentRepository;
import com.rentcar.rent_car.dto.mapper.ReservationMapper;
import com.rentcar.rent_car.dto.request.CompleteReservationRequest;
import com.rentcar.rent_car.dto.request.ReservationRequest;
import com.rentcar.rent_car.dto.request.StartReservationRequest;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.ReservationResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.service.ReservationService;
import com.rentcar.rent_car.service.ContractService;
import com.rentcar.rent_car.service.SseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReservationServiceImpl implements ReservationService {
    private final SseService sseService;
    private final PaymentRepository paymentRepository;

    private final ReservationRepository reservationRepository;
    private final UserRepository userRepository;
    private final CarRepository carRepository;
    private final ReservationMapper reservationMapper;
    private final ContractService contractService;

    @Override
    @Transactional
    public MessageResponse createReservation(ReservationRequest request, String clientEmail) {

        if (request.getStartDate().isAfter(request.getEndDate()) ||
                request.getStartDate().isEqual(request.getEndDate())) {
            return MessageResponse.error("La date de début doit être avant la date de fin");
        }

        // Vérifier disponibilité : CONFIRMED et IN_PROGRESS bloquent
        boolean isUnavailable = reservationRepository.isCarUnavailable(
                request.getCarId(),
                request.getStartDate(),
                request.getEndDate(),
                List.of(ReservationStatus.CONFIRMED, ReservationStatus.IN_PROGRESS));

        if (isUnavailable) {
            return MessageResponse.error("La voiture n'est pas disponible sur ces dates");
        }

        Car car = carRepository.findById(request.getCarId())
                .orElseThrow(() -> new RuntimeException("Voiture non trouvée"));

        if (car.getStatus() != CarStatus.AVAILABLE) {
            return MessageResponse.error("Cette voiture n'est pas disponible actuellement");
        }

        Reservation reservation = reservationMapper.toEntity(request, clientEmail);
        reservation.setStatus(ReservationStatus.PENDING);
        reservationRepository.save(reservation);
        User client = userRepository.findByEmail(clientEmail)
                .orElseThrow(() -> new RuntimeException("Client non trouvé"));

        sseService.createAndSend(client.getId(),
                "Réservation en attente",
                "Votre réservation pour " + car.getBrand() + " " + car.getModel() + " est en attente de confirmation.",
                "RESERVATION");
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        for (User admin : admins) {
            sseService.createAndSend(admin.getId(),
                    "Nouvelle réservation",
                    client.getFirstName() + " " + client.getLastName() + " a réservé " + car.getBrand() + " " + car.getModel(),
                    "RESERVATION");
        }




        return MessageResponse.success("Réservation créée avec succès",
                reservationMapper.toResponse(reservation));
    }

    @Override
    public List<ReservationResponse> getMyReservations(String clientEmail) {
        User client = userRepository.findByEmail(clientEmail)
                .orElseThrow(() -> new RuntimeException("Client non trouvé"));

        return reservationRepository.findByClientId(client.getId())
                .stream()
                .map(reservationMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ReservationResponse getReservationById(Long id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
        return reservationMapper.toResponse(reservation);
    }

    @Override
    public List<ReservationResponse> getAllReservations() {
        return reservationRepository.findAll()
                .stream()
                .map(reservationMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MessageResponse cancelReservation(Long id, String userEmail) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (!reservation.getClient().getId().equals(user.getId()) &&
                !user.getRole().name().equals("ADMIN")) {
            return MessageResponse.error("Vous n'êtes pas autorisé à annuler cette réservation");
        }

        if (reservation.getStatus() == ReservationStatus.IN_PROGRESS ||
                reservation.getStatus() == ReservationStatus.COMPLETED) {
            return MessageResponse.error("Cette réservation ne peut plus être annulée");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.getCar().setStatus(CarStatus.AVAILABLE);
        carRepository.save(reservation.getCar());
        reservationRepository.save(reservation);
        sseService.createAndSend(
                reservation.getClient().getId(),
                "Réservation annulée ❌",
                "Votre réservation #" + reservation.getId() + " a été annulée.",
                "RESERVATION"
        );

        return MessageResponse.success("Réservation annulée avec succès");
    }

    @Override
    @Transactional
    public MessageResponse confirmReservation(Long id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));

        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.getCar().setStatus(CarStatus.RESERVED);
        carRepository.save(reservation.getCar());
        reservationRepository.save(reservation);
        contractService.generateContract(id);
        sseService.createAndSend(reservation.getClient().getId(),
                "Réservation confirmée ✅",
                "Votre réservation #" + id + " a été confirmée. Le contrat est prêt.",
                "RESERVATION");

        return MessageResponse.success("Réservation confirmée avec succès");
    }

    @Override
    @Transactional
    public MessageResponse startReservation(Long id, StartReservationRequest request) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));


        Payment payment = paymentRepository.findByReservationId(id)
                .orElse(null);

        if (payment == null || payment.getStatus() != PaymentStatus.COMPLETED) {
            return MessageResponse.error("Le paiement doit être complété avant de démarrer la location");
        }

        // Démarrer la location
        reservation.setStatus(ReservationStatus.IN_PROGRESS);
        reservation.setMileageStart(request.getMileageStart());
        reservation.setFuelLevelStart(request.getFuelLevelStart());
        reservation.setDamagesAtStart(request.getDamagesAtStart());

        Car car = reservation.getCar();
        car.setStatus(CarStatus.RENTED);
        carRepository.save(car);
        reservationRepository.save(reservation);
        sseService.createAndSend(reservation.getClient().getId(),
                "Bonne route 🚗",
                "Votre location de " + reservation.getCar().getBrand() + " " + reservation.getCar().getModel() + " a démarré.",
                "RESERVATION");

        return MessageResponse.success("Location démarrée avec succès");
    }

    @Override
    @Transactional
    public MessageResponse completeReservation(Long id, CompleteReservationRequest request) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));

        reservation.setStatus(ReservationStatus.COMPLETED);
        reservation.setMileageEnd(request.getMileageEnd());
        reservation.setFuelLevelEnd(request.getFuelLevelEnd());
        reservation.setDamagesAtEnd(request.getDamagesAtEnd());  // ← Nouveau

        Car car = reservation.getCar();
        car.setStatus(CarStatus.AVAILABLE);
        car.setMileage(request.getMileageEnd());
        carRepository.save(car);

        reservationRepository.save(reservation);
        sseService.createAndSend(reservation.getClient().getId(),
                "Location terminée ✅",
                "Merci pour votre confiance ! Donnez votre avis sur " + reservation.getCar().getBrand() + " " + reservation.getCar().getModel() + " ⭐",
                "RESERVATION");

        return MessageResponse.success("Location terminée avec succès");
    }
}