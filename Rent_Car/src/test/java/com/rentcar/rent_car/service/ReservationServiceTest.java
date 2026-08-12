package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.mapper.CarMapper;
import com.rentcar.rent_car.dto.mapper.ReservationMapper;
import com.rentcar.rent_car.dto.request.CompleteReservationRequest;
import com.rentcar.rent_car.dto.request.ReservationRequest;
import com.rentcar.rent_car.dto.request.StartReservationRequest;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.ReservationResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Contract;
import com.rentcar.rent_car.entity.Payment;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.ContractStatus;
import com.rentcar.rent_car.enums.PaymentStatus;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.ContractRepository;
import com.rentcar.rent_car.repository.PaymentRepository;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.service.imp.ReservationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CarRepository carRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private ReservationMapper reservationMapper;

    @Mock
    private CarMapper carMapper;

    @Mock
    private SseService sseService;

    @Mock
    private ContractService contractService;

    @Mock
    private RecommendationService recommendationService;

    @InjectMocks
    private ReservationServiceImpl reservationService;

    private Reservation reservation;
    private User client;
    private User admin;
    private Car car;

    @BeforeEach
    void setUp() {
        client = new User();
        client.setId(1L);
        client.setEmail("client@test.com");
        client.setRole(Role.CLIENT);
        client.setFirstName("Alice");
        client.setLastName("Durand");

        admin = new User();
        admin.setId(2L);
        admin.setEmail("admin@test.com");
        admin.setRole(Role.ADMIN);

        car = new Car();
        car.setId(10L);
        car.setBrand("BMW");
        car.setModel("X5");
        car.setStatus(CarStatus.AVAILABLE);

        reservation = new Reservation();
        reservation.setId(100L);
        reservation.setCar(car);
        reservation.setClient(client);
        reservation.setStatus(ReservationStatus.PENDING);
    }

    // --- CREATE RESERVATION TESTS ---

    @Test
    void shouldCreateReservation_whenDatesAreValid() {
        ReservationRequest request = new ReservationRequest();
        request.setCarId(10L);
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusDays(2));

        when(reservationRepository.isCarUnavailable(eq(10L), any(), any(), anyList())).thenReturn(false);
        when(carRepository.findById(10L)).thenReturn(Optional.of(car));
        when(reservationMapper.toEntity(request, "client@test.com")).thenReturn(reservation);
        when(reservationRepository.save(any(Reservation.class))).thenReturn(reservation);
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(admin));
        when(reservationMapper.toResponse(reservation)).thenReturn(new ReservationResponse());

        MessageResponse result = reservationService.createReservation(request, "client@test.com");

        assertThat(result.isSuccess()).isTrue();
        verify(reservationRepository).save(any(Reservation.class));
        verify(sseService).createAndSend(eq(1L), anyString(), anyString(), anyString());
        verify(sseService).createAndSend(eq(2L), anyString(), anyString(), anyString());
    }

    @Test
    void shouldReturnError_whenStartDateAfterOrEqualEndDate() {
        ReservationRequest request = new ReservationRequest();
        request.setStartDate(LocalDate.now().plusDays(5));
        request.setEndDate(LocalDate.now().plusDays(2));

        MessageResponse result = reservationService.createReservation(request, "client@test.com");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("début doit être avant");
    }

    @Test
    void shouldReturnError_whenCarUnavailableOnDates() {
        ReservationRequest request = new ReservationRequest();
        request.setCarId(10L);
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusDays(2));

        when(reservationRepository.isCarUnavailable(eq(10L), any(), any(), anyList())).thenReturn(true);

        MessageResponse result = reservationService.createReservation(request, "client@test.com");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("pas disponible");
    }

    @Test
    void shouldThrow_whenCreateReservationCarNotFound() {
        ReservationRequest request = new ReservationRequest();
        request.setCarId(99L);
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusDays(2));

        when(reservationRepository.isCarUnavailable(eq(99L), any(), any(), anyList())).thenReturn(false);
        when(carRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reservationService.createReservation(request, "client@test.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Voiture non trouvée");
    }

    @Test
    void shouldReturnError_whenCarStatusNotAvailable() {
        car.setStatus(CarStatus.RESERVED);
        ReservationRequest request = new ReservationRequest();
        request.setCarId(10L);
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusDays(2));

        when(reservationRepository.isCarUnavailable(eq(10L), any(), any(), anyList())).thenReturn(false);
        when(carRepository.findById(10L)).thenReturn(Optional.of(car));

        MessageResponse result = reservationService.createReservation(request, "client@test.com");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("pas disponible actuellement");
    }

    // --- GET RESERVATIONS TESTS ---

    @Test
    void shouldReturnMyReservations_forClient() {
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(reservationRepository.findByClientId(1L)).thenReturn(List.of(reservation));
        when(reservationMapper.toResponse(reservation)).thenReturn(new ReservationResponse());

        List<ReservationResponse> result = reservationService.getMyReservations("client@test.com");

        assertThat(result).hasSize(1);
    }

    @Test
    void shouldGetReservationById_whenExists() {
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(reservationMapper.toResponse(reservation)).thenReturn(new ReservationResponse());

        ReservationResponse response = reservationService.getReservationById(100L);

        assertThat(response).isNotNull();
    }

    @Test
    void shouldThrow_whenReservationByIdNotFound() {
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reservationService.getReservationById(999L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Réservation non trouvée");
    }

    @Test
    void shouldGetAllReservations() {
        when(reservationRepository.findAll()).thenReturn(List.of(reservation));
        when(reservationMapper.toResponse(reservation)).thenReturn(new ReservationResponse());

        List<ReservationResponse> result = reservationService.getAllReservations();

        assertThat(result).hasSize(1);
    }

    // --- CANCEL & CONFIRM TESTS ---

    @Test
    void shouldCancelReservation_whenAllowedByClient() {
        reservation.setStatus(ReservationStatus.PENDING);
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(reservationRepository.save(any(Reservation.class))).thenReturn(reservation);
        when(carRepository.save(any(Car.class))).thenReturn(car);
        when(reservationMapper.toResponse(reservation)).thenReturn(new ReservationResponse());
        when(carMapper.toResponse(car)).thenReturn(new CarResponse());

        MessageResponse result = reservationService.cancelReservation(100L, "client@test.com");

        assertThat(result.isSuccess()).isTrue();
        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
    }

    @Test
    void shouldReturnError_whenCancellingReservationOfOtherUser() {
        User otherUser = new User();
        otherUser.setId(99L);
        otherUser.setRole(Role.CLIENT);

        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(userRepository.findByEmail("other@test.com")).thenReturn(Optional.of(otherUser));

        MessageResponse result = reservationService.cancelReservation(100L, "other@test.com");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("pas autorisé");
    }

    @Test
    void shouldReturnError_whenCancellingCompletedOrInProgressReservation() {
        reservation.setStatus(ReservationStatus.IN_PROGRESS);
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));

        MessageResponse result = reservationService.cancelReservation(100L, "client@test.com");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("ne peut plus être annulée");
    }

    @Test
    void shouldConfirmReservation_successfully() {
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(reservationMapper.toResponse(reservation)).thenReturn(new ReservationResponse());
        when(carMapper.toResponse(car)).thenReturn(new CarResponse());

        MessageResponse result = reservationService.confirmReservation(100L);

        assertThat(result.isSuccess()).isTrue();
        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CONFIRMED);
        assertThat(car.getStatus()).isEqualTo(CarStatus.RESERVED);
        verify(contractService).generateContract(100L);
    }

    // --- START & COMPLETE RESERVATION TESTS ---

    @Test
    void shouldReturnError_whenStartReservationWithoutContract() {
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(contractRepository.findByReservationId(100L)).thenReturn(Optional.empty());

        MessageResponse result = reservationService.startReservation(100L, new StartReservationRequest());

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("Aucun contrat n'a été généré");
    }

    @Test
    void shouldReturnError_whenStartReservationContractDraft() {
        Contract contract = new Contract();
        contract.setStatus(ContractStatus.DRAFT);
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(contractRepository.findByReservationId(100L)).thenReturn(Optional.of(contract));

        MessageResponse result = reservationService.startReservation(100L, new StartReservationRequest());

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("pas encore signé");
    }

    @Test
    void shouldReturnError_whenStartReservationContractCancelled() {
        Contract contract = new Contract();
        contract.setStatus(ContractStatus.CANCELLED);
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(contractRepository.findByReservationId(100L)).thenReturn(Optional.of(contract));

        MessageResponse result = reservationService.startReservation(100L, new StartReservationRequest());

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("Le contrat a été annulé");
    }

    @Test
    void shouldReturnError_whenStartReservationPaymentNotCompleted() {
        Contract contract = new Contract();
        contract.setStatus(ContractStatus.SIGNED);
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(contractRepository.findByReservationId(100L)).thenReturn(Optional.of(contract));
        when(paymentRepository.findByReservationId(100L)).thenReturn(Optional.empty());

        MessageResponse result = reservationService.startReservation(100L, new StartReservationRequest());

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("Le paiement n'a pas été reçu");
    }

    @Test
    void shouldStartReservation_successfully() {
        Contract contract = new Contract();
        contract.setStatus(ContractStatus.SIGNED);

        Payment payment = new Payment();
        payment.setStatus(PaymentStatus.COMPLETED);

        StartReservationRequest request = new StartReservationRequest();
        request.setMileageStart(50000);
        request.setFuelLevelStart("100%");
        request.setDamagesAtStart("Aucun");

        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(contractRepository.findByReservationId(100L)).thenReturn(Optional.of(contract));
        when(paymentRepository.findByReservationId(100L)).thenReturn(Optional.of(payment));
        when(reservationMapper.toResponse(reservation)).thenReturn(new ReservationResponse());
        when(carMapper.toResponse(car)).thenReturn(new CarResponse());

        MessageResponse result = reservationService.startReservation(100L, request);

        assertThat(result.isSuccess()).isTrue();
        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.IN_PROGRESS);
        assertThat(car.getStatus()).isEqualTo(CarStatus.RENTED);
        verify(reservationRepository).save(reservation);
    }

    @Test
    void shouldCompleteReservation_successfully() {
        CompleteReservationRequest request = new CompleteReservationRequest();
        request.setMileageEnd(50500);
        request.setFuelLevelEnd("90%");
        request.setDamagesAtEnd("Rayure aile gauche");

        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(reservationMapper.toResponse(reservation)).thenReturn(new ReservationResponse());
        when(carMapper.toResponse(car)).thenReturn(new CarResponse());

        MessageResponse result = reservationService.completeReservation(100L, request);

        assertThat(result.isSuccess()).isTrue();
        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.COMPLETED);
        assertThat(car.getStatus()).isEqualTo(CarStatus.AVAILABLE);
        assertThat(car.getMileage()).isEqualTo(50500);
        verify(recommendationService).triggerRetrainAsync();
    }
}

