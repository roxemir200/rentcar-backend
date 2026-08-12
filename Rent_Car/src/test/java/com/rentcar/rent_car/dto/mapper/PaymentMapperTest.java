package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.response.PaymentResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Payment;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.PaymentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentMapperTest {

    private PaymentMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new PaymentMapper();
    }

    @Test
    void shouldToResponse_withFullDetails() {
        User client = new User();
        client.setFirstName("Jean");
        client.setLastName("Dupont");

        Car car = new Car();
        car.setBrand("Peugeot");
        car.setModel("208");

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setClient(client);
        reservation.setCar(car);

        Payment payment = new Payment();
        payment.setId(15L);
        payment.setExternalPaymentId("pi_123");
        payment.setAmount(new BigDecimal("150.00"));
        payment.setCurrency("EUR");
        payment.setProvider("STRIPE");
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setPaymentDate(LocalDateTime.now());
        payment.setReservation(reservation);
        payment.setCreatedAt(LocalDateTime.now());

        PaymentResponse response = mapper.toResponse(payment);

        assertThat(response.getId()).isEqualTo(15L);
        assertThat(response.getExternalPaymentId()).isEqualTo("pi_123");
        assertThat(response.getReservationId()).isEqualTo(100L);
        assertThat(response.getClientName()).isEqualTo("Jean Dupont");
        assertThat(response.getCarInfo()).isEqualTo("Peugeot 208");
    }

    @Test
    void shouldToResponse_withNullReservation() {
        Payment payment = new Payment();
        payment.setId(16L);

        PaymentResponse response = mapper.toResponse(payment);

        assertThat(response.getId()).isEqualTo(16L);
        assertThat(response.getReservationId()).isNull();
        assertThat(response.getClientName()).isNull();
        assertThat(response.getCarInfo()).isNull();
    }
}
