package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.mapper.CarMapper;
import com.rentcar.rent_car.dto.mapper.PaymentMapper;
import com.rentcar.rent_car.dto.mapper.ReservationMapper;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.PaymentIntentResponse;
import com.rentcar.rent_car.dto.response.PaymentResponse;
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
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.ContractRepository;
import com.rentcar.rent_car.repository.PaymentRepository;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.service.imp.PaymentServiceImpl;

import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;

import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private SseService sseService;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private CarRepository carRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PaymentMapper paymentMapper;

    @Mock
    private ReservationMapper reservationMapper;

    @Mock
    private CarMapper carMapper;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    private Reservation reservation;
    private Contract contract;
    private Payment payment;
    private User client;
    private User admin;
    private Car car;

    @BeforeEach
    void setUp() {
        client = new User();
        client.setId(1L);
        client.setEmail("client@test.com");
        client.setFirstName("Alice");
        client.setLastName("Smith");

        admin = new User();
        admin.setId(2L);
        admin.setRole(Role.ADMIN);

        car = new Car();
        car.setId(10L);
        car.setBrand("Audi");
        car.setModel("A6");
        car.setStatus(CarStatus.RESERVED);

        reservation = new Reservation();
        reservation.setId(100L);
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setTotalAmount(new BigDecimal("500"));
        reservation.setClient(client);
        reservation.setCar(car);

        contract = new Contract();
        contract.setId(50L);
        contract.setStatus(ContractStatus.SIGNED);
        contract.setReservation(reservation);

        payment = new Payment();
        payment.setId(1000L);
        payment.setAmount(new BigDecimal("500"));
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setExternalPaymentId("pi_stripe_123");
        payment.setReservation(reservation);
    }

    // --- CREATE PAYMENT INTENT VALIDATION TESTS ---

    @Test
    void shouldThrow_whenCreatePaymentIntentReservationNotFound() {
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.createPaymentIntent(999L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Réservation non trouvée");
    }

    @Test
    void shouldThrow_whenCreatePaymentIntentReservationNotConfirmed() {
        reservation.setStatus(ReservationStatus.PENDING);
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> paymentService.createPaymentIntent(100L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("doit être confirmée");
    }

    @Test
    void shouldThrow_whenCreatePaymentIntentContractNotFound() {
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(contractRepository.findByReservationId(100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.createPaymentIntent(100L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Contrat non trouvé");
    }

    @Test
    void shouldThrow_whenCreatePaymentIntentContractNotSigned() {
        contract.setStatus(ContractStatus.DRAFT);
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(contractRepository.findByReservationId(100L)).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> paymentService.createPaymentIntent(100L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("doit être signé");
    }

    @Test
    void shouldThrow_whenCreatePaymentIntentAlreadyCompleted() {
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(contractRepository.findByReservationId(100L)).thenReturn(Optional.of(contract));
        when(paymentRepository.findByReservationId(100L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.createPaymentIntent(100L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("déjà payée");
    }

    // --- GET PAYMENTS TESTS ---

    @Test
    void shouldGetPaymentByReservation() {
        when(paymentRepository.findByReservationId(100L)).thenReturn(Optional.of(payment));
        when(paymentMapper.toResponse(payment)).thenReturn(new PaymentResponse());

        PaymentResponse response = paymentService.getPaymentByReservation(100L);

        assertThat(response).isNotNull();
    }

    @Test
    void shouldThrow_whenGetPaymentByReservationNotFound() {
        when(paymentRepository.findByReservationId(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.getPaymentByReservation(999L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Aucun paiement trouvé");
    }

    @Test
    void shouldGetAllPayments() {
        when(paymentRepository.findAll()).thenReturn(List.of(payment));
        when(paymentMapper.toResponse(payment)).thenReturn(new PaymentResponse());

        List<PaymentResponse> list = paymentService.getAllPayments();

        assertThat(list).hasSize(1);
    }

    @Test
    void shouldGetPaymentsByCurrentUser() {
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(paymentRepository.findByReservationClientId(1L)).thenReturn(List.of(payment));
        when(paymentMapper.toResponse(payment)).thenReturn(new PaymentResponse());

        List<PaymentResponse> list = paymentService.getPaymentsByCurrentUser("client@test.com");

        assertThat(list).hasSize(1);
    }

    @Test
    void shouldThrow_whenGetPaymentsByCurrentUserNotFound() {
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.getPaymentsByCurrentUser("unknown@test.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Client non trouvé");
    }

    // --- REFUND PAYMENT TESTS ---

    @Test
    void shouldReturnError_whenRefundPaymentNotFound() {
        when(paymentRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.refundPayment(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Paiement non trouvé");
    }

    @Test
    void shouldReturnError_whenRefundPaymentWithoutReservation() {
        payment.setReservation(null);
        when(paymentRepository.findById(1000L)).thenReturn(Optional.of(payment));

        MessageResponse response = paymentService.refundPayment(1000L);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("aucune réservation");
    }

    @Test
    void shouldReturnError_whenRefundPaymentAlreadyRefunded() {
        payment.setStatus(PaymentStatus.REFUNDED);
        when(paymentRepository.findById(1000L)).thenReturn(Optional.of(payment));

        MessageResponse response = paymentService.refundPayment(1000L);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("déjà été remboursé");
    }

    @Test
    void shouldReturnError_whenRefundPaymentNotCompleted() {
        payment.setStatus(PaymentStatus.PENDING);
        when(paymentRepository.findById(1000L)).thenReturn(Optional.of(payment));

        MessageResponse response = paymentService.refundPayment(1000L);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Seul un paiement complété");
    }

    @Test
    void shouldReturnError_whenRefundPaymentRentalInProgress() {
        reservation.setStatus(ReservationStatus.IN_PROGRESS);
        when(paymentRepository.findById(1000L)).thenReturn(Optional.of(payment));

        MessageResponse response = paymentService.refundPayment(1000L);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("location en cours");
    }

    @Test
    void shouldReturnError_whenRefundPaymentReservationCompleted() {
        reservation.setStatus(ReservationStatus.COMPLETED);
        when(paymentRepository.findById(1000L)).thenReturn(Optional.of(payment));

        MessageResponse response = paymentService.refundPayment(1000L);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("terminée ne peut pas être remboursée");
    }

    @Test
    void shouldReturnError_whenRefundPaymentReservationAlreadyCancelled() {
        reservation.setStatus(ReservationStatus.CANCELLED);
        when(paymentRepository.findById(1000L)).thenReturn(Optional.of(payment));

        MessageResponse response = paymentService.refundPayment(1000L);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("déjà annulée");
    }

    @Test
    void shouldReturnError_whenRefundPaymentExternalIdBlank() {
        payment.setExternalPaymentId(" ");
        when(paymentRepository.findById(1000L)).thenReturn(Optional.of(payment));

        MessageResponse response = paymentService.refundPayment(1000L);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Identifiant Stripe introuvable");
    }

    @Test
    void shouldRefundPaymentSuccessfully() throws Exception {
        // Given
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setExternalPaymentId("pi_stripe_123");

        when(paymentRepository.findById(1000L)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenReturn(payment);
        when(reservationRepository.save(any(Reservation.class))).thenReturn(reservation);
        when(carRepository.save(any(Car.class))).thenReturn(car);
        when(contractRepository.findByReservationId(100L)).thenReturn(Optional.of(contract));
        when(contractRepository.save(any(Contract.class))).thenReturn(contract);
        when(paymentMapper.toResponse(any(Payment.class))).thenReturn(new PaymentResponse());
        when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(admin));

        try (var mockedStatic = mockStatic(com.stripe.model.Refund.class)) {
            com.stripe.model.Refund refund = mock(com.stripe.model.Refund.class);
            mockedStatic.when(() -> com.stripe.model.Refund.create(any(com.stripe.param.RefundCreateParams.class)))
                    .thenReturn(refund);

            // When
            MessageResponse response = paymentService.refundPayment(1000L);

            // Then
            assertThat(response.isSuccess()).isTrue();
            assertThat(response.getMessage()).contains("Remboursement effectué avec succès");

            verify(paymentRepository).save(any(Payment.class));
            verify(reservationRepository).save(any(Reservation.class));
            verify(carRepository).save(any(Car.class));
            verify(contractRepository).save(any(Contract.class));
            verify(sseService, atLeastOnce()).sendEvent(anyLong(), anyString(), any());
        }
    }

    @Test
    void shouldReturnErrorWhenRefundStripeFails() throws Exception {
        // Given
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setExternalPaymentId("pi_stripe_123");

        when(paymentRepository.findById(1000L)).thenReturn(Optional.of(payment));

        try (var mockedStatic = mockStatic(com.stripe.model.Refund.class)) {
            mockedStatic.when(() -> com.stripe.model.Refund.create(any(com.stripe.param.RefundCreateParams.class)))
                    .thenThrow(new RuntimeException("Stripe error"));

            // When
            MessageResponse response = paymentService.refundPayment(1000L);

            // Then
            assertThat(response.isSuccess()).isFalse();
            assertThat(response.getMessage()).contains("Échec du remboursement Stripe");
            verify(paymentRepository, never()).save(any(Payment.class));
        }
    }

    // --- TESTS POUR getPaymentsByCurrentUser ---

    @Test
    void shouldGetPaymentsByCurrentUserWithLogging() {
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(paymentRepository.findByReservationClientId(1L)).thenReturn(List.of(payment));
        when(paymentMapper.toResponse(payment)).thenReturn(new PaymentResponse());

        List<PaymentResponse> list = paymentService.getPaymentsByCurrentUser("client@test.com");

        assertThat(list).hasSize(1);
        verify(paymentRepository).findByReservationClientId(1L);
    }

    @Test
    void shouldGetAllPaymentsWithEmptyList() {
        when(paymentRepository.findAll()).thenReturn(Collections.emptyList());

        List<PaymentResponse> list = paymentService.getAllPayments();

        assertThat(list).isEmpty();
        verify(paymentRepository).findAll();
    }

    @Test
    void shouldCreatePaymentIntentWhenExistingPaymentNotCompleted() throws Exception {
        // Given
        Payment existingPayment = new Payment();
        existingPayment.setId(1000L);
        existingPayment.setStatus(PaymentStatus.PENDING);
        existingPayment.setReservation(reservation);

        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(contractRepository.findByReservationId(100L)).thenReturn(Optional.of(contract));
        when(paymentRepository.findByReservationId(100L)).thenReturn(Optional.of(existingPayment));

        Payment savedPayment = new Payment();
        savedPayment.setId(1000L);
        savedPayment.setExternalPaymentId("pi_test_456");
        when(paymentRepository.save(any(Payment.class))).thenReturn(savedPayment);

        PaymentIntent paymentIntent = mock(PaymentIntent.class);
        when(paymentIntent.getId()).thenReturn("pi_test_456");
        when(paymentIntent.getClientSecret()).thenReturn("secret_test_456");

        try (var mockedStatic = mockStatic(com.stripe.model.PaymentIntent.class)) {
            mockedStatic.when(() -> com.stripe.model.PaymentIntent.create(any(PaymentIntentCreateParams.class)))
                    .thenReturn(paymentIntent);

            // When
            PaymentIntentResponse response = paymentService.createPaymentIntent(100L);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.getPaymentIntentId()).isEqualTo("pi_test_456");
            verify(paymentRepository, times(1)).save(any(Payment.class));
        }
    }
}