package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Payment;
import com.rentcar.rent_car.enums.PaymentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentRepositoryTest {

    @Mock
    private PaymentRepository paymentRepository;

    private Payment payment;

    @BeforeEach
    void setUp() {
        payment = new Payment();
        payment.setId(10L);
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setExternalPaymentId("pi_stripe_123");
    }

    @Test
    void shouldFindByReservationId() {
        when(paymentRepository.findByReservationId(100L)).thenReturn(Optional.of(payment));

        Optional<Payment> found = paymentRepository.findByReservationId(100L);

        assertThat(found).isPresent();
        assertThat(found.get().getExternalPaymentId()).isEqualTo("pi_stripe_123");
    }

    @Test
    void shouldFindByExternalPaymentId() {
        when(paymentRepository.findByExternalPaymentId("pi_stripe_123")).thenReturn(Optional.of(payment));

        Optional<Payment> found = paymentRepository.findByExternalPaymentId("pi_stripe_123");

        assertThat(found).isPresent();
    }

    @Test
    void shouldFindByReservationClientId() {
        when(paymentRepository.findByReservationClientId(1L)).thenReturn(List.of(payment));

        List<Payment> payments = paymentRepository.findByReservationClientId(1L);

        assertThat(payments).hasSize(1);
    }

    @Test
    void shouldFindByStatus() {
        when(paymentRepository.findByStatus(PaymentStatus.COMPLETED)).thenReturn(List.of(payment));

        List<Payment> completedPayments = paymentRepository.findByStatus(PaymentStatus.COMPLETED);

        assertThat(completedPayments).hasSize(1);
    }

    @Test
    void shouldFindTopByStatusOrderByCreatedAtDesc() {
        when(paymentRepository.findTopByStatusOrderByCreatedAtDesc(PaymentStatus.COMPLETED)).thenReturn(Optional.of(payment));

        Optional<Payment> top = paymentRepository.findTopByStatusOrderByCreatedAtDesc(PaymentStatus.COMPLETED);

        assertThat(top).isPresent();
    }
}
