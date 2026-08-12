package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.response.CalendarReservationResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.ReservationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class CalendarReservationMapperTest {

    private CalendarReservationMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new CalendarReservationMapper();
    }

    @Test
    void shouldMapToResponse_withFullDetails() {
        Car car = new Car();
        car.setId(10L);
        car.setBrand("BMW");
        car.setModel("X5");

        User client = new User();
        client.setId(1L);
        client.setFirstName("Jean");
        client.setLastName("Dupont");

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setCar(car);
        reservation.setClient(client);
        reservation.setStartDate(LocalDate.of(2026, 8, 1));
        reservation.setEndDate(LocalDate.of(2026, 8, 5));
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setTotalAmount(new BigDecimal("500.00"));

        CalendarReservationResponse response = mapper.mapToResponse(reservation);

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getCarBrand()).isEqualTo("BMW");
        assertThat(response.getCarModel()).isEqualTo("X5");
        assertThat(response.getClientFirstName()).isEqualTo("Jean");
        assertThat(response.getClientLastName()).isEqualTo("Dupont");
        assertThat(response.getCarId()).isEqualTo(10L);
        assertThat(response.getClientId()).isEqualTo(1L);
        assertThat(response.getTotalAmount()).isEqualTo(500.0);
        assertThat(response.getStatus()).isEqualTo("CONFIRMED");
    }

    @Test
    void shouldMapToResponse_withNullFields() {
        Reservation reservation = new Reservation();
        reservation.setId(101L);

        CalendarReservationResponse response = mapper.mapToResponse(reservation);

        assertThat(response.getId()).isEqualTo(101L);
        assertThat(response.getCarBrand()).isNull();
        assertThat(response.getCarModel()).isNull();
        assertThat(response.getClientFirstName()).isNull();
        assertThat(response.getClientLastName()).isNull();
        assertThat(response.getCarId()).isNull();
        assertThat(response.getClientId()).isNull();
        assertThat(response.getTotalAmount()).isNull();
        assertThat(response.getStatus()).isEqualTo("PENDING");
    }
}
