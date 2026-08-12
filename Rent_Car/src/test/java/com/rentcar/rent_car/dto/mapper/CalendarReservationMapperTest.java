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
    void mapToResponse_shouldReturnNull_whenReservationIsNull() {
        assertThat(mapper.mapToResponse(null)).isNull();
    }

    @Test
    void mapToResponse_shouldHandleNullStatus() {
        Reservation reservation = new Reservation();
        reservation.setId(1L);
        reservation.setStatus(null);
        reservation.setStartDate(LocalDate.of(2026, 8, 1));
        reservation.setEndDate(LocalDate.of(2026, 8, 4));

        Car car = new Car();
        car.setId(10L);
        car.setBrand("Toyota");
        car.setModel("Corolla");
        reservation.setCar(car);

        User client = new User();
        client.setId(20L);
        client.setFirstName("Jean");
        client.setLastName("Dupont");
        reservation.setClient(client);

        reservation.setTotalAmount(BigDecimal.valueOf(150.00));

        CalendarReservationResponse result = mapper.mapToResponse(reservation);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getStatus()).isNull();
        assertThat(result.getCarBrand()).isEqualTo("Toyota");
        assertThat(result.getClientFirstName()).isEqualTo("Jean");
    }

    @Test
    void mapToResponse_shouldHandleNullCarAndClient() {
        Reservation reservation = new Reservation();
        reservation.setId(1L);
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setStartDate(LocalDate.of(2026, 8, 1));
        reservation.setEndDate(LocalDate.of(2026, 8, 4));
        reservation.setCar(null);
        reservation.setClient(null);
        reservation.setTotalAmount(BigDecimal.valueOf(150.00));

        CalendarReservationResponse result = mapper.mapToResponse(reservation);

        assertThat(result).isNotNull();
        assertThat(result.getCarBrand()).isNull();
        assertThat(result.getCarModel()).isNull();
        assertThat(result.getClientFirstName()).isNull();
        assertThat(result.getClientLastName()).isNull();
        assertThat(result.getCarId()).isNull();
        assertThat(result.getClientId()).isNull();
        assertThat(result.getStatus()).isEqualTo("CONFIRMED");
        assertThat(result.getTotalAmount()).isEqualTo(150.00);
    }

    @Test
    void mapToResponse_shouldHandleNullTotalAmount() {
        Reservation reservation = new Reservation();
        reservation.setId(1L);
        reservation.setTotalAmount(null);

        CalendarReservationResponse result = mapper.mapToResponse(reservation);

        assertThat(result).isNotNull();
        assertThat(result.getTotalAmount()).isNull();
    }
}