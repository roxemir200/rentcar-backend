package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.response.CalendarReservationResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Client;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.enums.ReservationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class CalendarReservationMapperTest {

    private CalendarReservationMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new CalendarReservationMapper();
    }

    @Test
    void mapToResponse_shouldReturnNull_whenReservationIsNull() {
        // Given
        Reservation reservation = null;

        // When
        CalendarReservationResponse result = mapper.mapToResponse(reservation);

        // Then
        assertThat(result).isNull();
    }

    @Test
    void mapToResponse_shouldHandleNullStatus() {
        // Given
        Reservation reservation = new Reservation();
        reservation.setId(1L);
        reservation.setStatus(null); // ← Condition non couverte !
        reservation.setStartDate(LocalDateTime.now());
        reservation.setEndDate(LocalDateTime.now().plusDays(3));

        Car car = new Car();
        car.setId(10L);
        car.setBrand("Toyota");
        car.setModel("Corolla");
        reservation.setCar(car);

        Client client = new Client();
        client.setId(20L);
        client.setFirstName("Jean");
        client.setLastName("Dupont");
        reservation.setClient(client);

        reservation.setTotalAmount(BigDecimal.valueOf(150.00));

        // When
        CalendarReservationResponse result = mapper.mapToResponse(reservation);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getStatus()).isNull(); // Vérifie que status est null
        assertThat(result.getCarBrand()).isEqualTo("Toyota");
        assertThat(result.getClientFirstName()).isEqualTo("Jean");
    }

    @Test
    void mapToResponse_shouldHandleNullCarAndClient() {
        // Given
        Reservation reservation = new Reservation();
        reservation.setId(1L);
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setStartDate(LocalDateTime.now());
        reservation.setEndDate(LocalDateTime.now().plusDays(3));
        reservation.setCar(null); // ← Car null
        reservation.setClient(null); // ← Client null
        reservation.setTotalAmount(BigDecimal.valueOf(150.00));

        // When
        CalendarReservationResponse result = mapper.mapToResponse(reservation);

        // Then
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
        // Given
        Reservation reservation = new Reservation();
        reservation.setId(1L);
        reservation.setStatus(ReservationStatus.PENDING);
        reservation.setStartDate(LocalDateTime.now());
        reservation.setEndDate(LocalDateTime.now().plusDays(3));
        reservation.setCar(new Car());
        reservation.setClient(new Client());
        reservation.setTotalAmount(null); // ← TotalAmount null

        // When
        CalendarReservationResponse result = mapper.mapToResponse(reservation);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalAmount()).isNull(); // Vérifie que totalAmount est null
    }

    @Test
    void mapToResponse_shouldMapAllFieldsCorrectly() {
        // Given
        Reservation reservation = new Reservation();
        reservation.setId(1L);
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setStartDate(LocalDateTime.now());
        reservation.setEndDate(LocalDateTime.now().plusDays(3));

        Car car = new Car();
        car.setId(10L);
        car.setBrand("Tesla");
        car.setModel("Model 3");
        reservation.setCar(car);

        Client client = new Client();
        client.setId(20L);
        client.setFirstName("Marie");
        client.setLastName("Martin");
        reservation.setClient(client);

        reservation.setTotalAmount(BigDecimal.valueOf(250.50));

        // When
        CalendarReservationResponse result = mapper.mapToResponse(reservation);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getCarBrand()).isEqualTo("Tesla");
        assertThat(result.getCarModel()).isEqualTo("Model 3");
        assertThat(result.getCarId()).isEqualTo(10L);
        assertThat(result.getClientFirstName()).isEqualTo("Marie");
        assertThat(result.getClientLastName()).isEqualTo("Martin");
        assertThat(result.getClientId()).isEqualTo(20L);
        assertThat(result.getStatus()).isEqualTo("CONFIRMED");
        assertThat(result.getTotalAmount()).isEqualTo(250.50);
    }
}