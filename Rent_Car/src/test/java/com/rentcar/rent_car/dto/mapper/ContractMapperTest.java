package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.response.ContractResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Contract;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.ContractStatus;
import com.rentcar.rent_car.enums.FuelType;
import com.rentcar.rent_car.enums.Transmission;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class ContractMapperTest {

    private ContractMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new ContractMapper();
    }

    @Test
    void toResponse_shouldReturnNull_whenContractIsNull() {
        ContractResponse result = mapper.toResponse(null);
        assertThat(result).isNull();
    }

    @Test
    void toResponse_shouldHandleNullReservation() {
        Contract contract = new Contract();
        contract.setId(1L);
        contract.setContractNumber("CT-2026-001");
        contract.setReservation(null);

        ContractResponse result = mapper.toResponse(contract);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getReservationId()).isNull();
        assertThat(result.getClientFirstName()).isNull();
        assertThat(result.getCarBrand()).isNull();
        assertThat(result.getStartDate()).isNull();
        assertThat(result.getDurationDays()).isNull();
    }

    @Test
    void toResponse_shouldHandleNullStartDateAndEndDate() {
        Contract contract = new Contract();
        contract.setId(1L);
        contract.setContractNumber("CT-2026-001");

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setStartDate(null);
        reservation.setEndDate(null);
        reservation.setClient(new User());
        reservation.setCar(new Car());

        contract.setReservation(reservation);

        ContractResponse result = mapper.toResponse(contract);

        assertThat(result).isNotNull();
        assertThat(result.getStartDate()).isNull();
        assertThat(result.getEndDate()).isNull();
        assertThat(result.getDurationDays()).isNull();
    }

    @Test
    void toResponse_shouldHandleNullCar() {
        Contract contract = new Contract();
        contract.setId(1L);
        contract.setContractNumber("CT-2026-001");

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setCar(null);
        reservation.setClient(new User());
        reservation.setStartDate(LocalDate.of(2026, 8, 1));
        reservation.setEndDate(LocalDate.of(2026, 8, 4));

        contract.setReservation(reservation);

        ContractResponse result = mapper.toResponse(contract);

        assertThat(result).isNotNull();
        assertThat(result.getCarBrand()).isNull();
        assertThat(result.getCarFuelType()).isNull();
        assertThat(result.getCarTransmission()).isNull();
        assertThat(result.getDurationDays()).isEqualTo(3L);
    }

    @Test
    void toResponse_shouldHandleNullFuelAndTransmission() {
        Contract contract = new Contract();
        contract.setId(1L);

        Car car = new Car();
        car.setBrand("Audi");
        car.setFuelType(null);
        car.setTransmission(null);

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setCar(car);

        contract.setReservation(reservation);

        ContractResponse result = mapper.toResponse(contract);

        assertThat(result).isNotNull();
        assertThat(result.getCarBrand()).isEqualTo("Audi");
        assertThat(result.getCarFuelType()).isNull();
        assertThat(result.getCarTransmission()).isNull();
    }

    @Test
    void toResponse_shouldMapFullDetails() {
        User client = new User();
        client.setFirstName("Jean");
        client.setLastName("Dupont");
        client.setEmail("jean@test.com");

        Car car = new Car();
        car.setBrand("Audi");
        car.setModel("A4");
        car.setRegistrationNumber("CD-456-EF");
        car.setColor("Gris");
        car.setMileage(20000);
        car.setFuelType(FuelType.DIESEL);
        car.setTransmission(Transmission.AUTOMATIC);
        car.setSeats(5);

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setClient(client);
        reservation.setCar(car);
        reservation.setStartDate(LocalDate.of(2026, 8, 1));
        reservation.setEndDate(LocalDate.of(2026, 8, 6));
        reservation.setPickupLocation("Paris");
        reservation.setReturnLocation("Lyon");
        reservation.setPricePerDaySnapshot(new BigDecimal("90.00"));
        reservation.setTotalAmount(new BigDecimal("450.00"));

        Contract contract = new Contract();
        contract.setId(50L);
        contract.setContractNumber("CTR-2026-0001");
        contract.setTerms("Conditions générales");
        contract.setPdfUrl("/pdf/ctr.pdf");
        contract.setStatus(ContractStatus.SIGNED);
        contract.setSignedAt(LocalDateTime.now());
        contract.setReservation(reservation);
        contract.setCreatedAt(LocalDateTime.now());

        ContractResponse response = mapper.toResponse(contract);

        assertThat(response.getId()).isEqualTo(50L);
        assertThat(response.getContractNumber()).isEqualTo("CTR-2026-0001");
        assertThat(response.getReservationId()).isEqualTo(100L);
        assertThat(response.getClientFirstName()).isEqualTo("Jean");
        assertThat(response.getCarBrand()).isEqualTo("Audi");
        assertThat(response.getCarFuelType()).isEqualTo("DIESEL");
        assertThat(response.getCarTransmission()).isEqualTo("AUTOMATIC");
        assertThat(response.getDurationDays()).isEqualTo(5L);
    }
}