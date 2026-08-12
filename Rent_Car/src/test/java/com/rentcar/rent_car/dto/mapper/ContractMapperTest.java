package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.response.ContractResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Contract;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.User; // ← Changé: Client → User
import com.rentcar.rent_car.entity.FuelType; // ← Changé: enums.FuelType → FuelType directement
import com.rentcar.rent_car.entity.TransmissionType; // ← Changé: enums.TransmissionType → TransmissionType directement
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
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
        // Given
        Contract contract = null;

        // When
        ContractResponse result = mapper.toResponse(contract);

        // Then
        assertThat(result).isNull();
    }

    @Test
    void toResponse_shouldHandleNullReservation() {
        // Given
        Contract contract = new Contract();
        contract.setId(1L);
        contract.setContractNumber("CT-2024-001");
        contract.setReservation(null);

        // When
        ContractResponse result = mapper.toResponse(contract);

        // Then
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
        // Given
        Contract contract = new Contract();
        contract.setId(1L);
        contract.setContractNumber("CT-2024-001");

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setStartDate(null);
        reservation.setEndDate(null);
        reservation.setClient(new User()); // ← Changé: Client → User
        reservation.setCar(new Car());

        contract.setReservation(reservation);

        // When
        ContractResponse result = mapper.toResponse(contract);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getStartDate()).isNull();
        assertThat(result.getEndDate()).isNull();
        assertThat(result.getDurationDays()).isNull();
    }

    @Test
    void toResponse_shouldHandleNullCar() {
        // Given
        Contract contract = new Contract();
        contract.setId(1L);
        contract.setContractNumber("CT-2024-001");

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setCar(null);
        reservation.setClient(new User()); // ← Changé: Client → User
        reservation.setStartDate(LocalDateTime.now());
        reservation.setEndDate(LocalDateTime.now().plusDays(3));

        contract.setReservation(reservation);

        // When
        ContractResponse result = mapper.toResponse(contract);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCarBrand()).isNull();
        assertThat(result.getCarModel()).isNull();
        assertThat(result.getCarFuelType()).isNull();
        assertThat(result.getCarTransmission()).isNull();
    }

    @Test
    void toResponse_shouldHandleNullFuelTypeAndTransmission() {
        // Given
        Contract contract = new Contract();
        contract.setId(1L);

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setStartDate(LocalDateTime.now());
        reservation.setEndDate(LocalDateTime.now().plusDays(5));

        Car car = new Car();
        car.setBrand("Renault");
        car.setModel("Clio");
        car.setFuelType(null);
        car.setTransmission(null);

        reservation.setCar(car);
        reservation.setClient(new User()); // ← Changé: Client → User
        contract.setReservation(reservation);

        // When
        ContractResponse result = mapper.toResponse(contract);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCarFuelType()).isNull();
        assertThat(result.getCarTransmission()).isNull();
    }

    @Test
    void toResponse_shouldCalculateDurationDaysCorrectly() {
        // Given
        Contract contract = new Contract();
        contract.setId(1L);

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        LocalDateTime startDate = LocalDateTime.of(2024, 1, 1, 10, 0);
        LocalDateTime endDate = LocalDateTime.of(2024, 1, 8, 10, 0);
        reservation.setStartDate(startDate);
        reservation.setEndDate(endDate);
        reservation.setClient(new User()); // ← Changé: Client → User
        reservation.setCar(new Car());

        contract.setReservation(reservation);

        // When
        ContractResponse result = mapper.toResponse(contract);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getDurationDays()).isEqualTo(7L);
    }

    @Test
    void toResponse_shouldMapAllFieldsCorrectly() {
        // Given
        Contract contract = new Contract();
        contract.setId(1L);
        contract.setContractNumber("CT-2024-001");
        contract.setTerms("Termes du contrat");
        contract.setPdfUrl("/pdfs/contract.pdf");
        contract.setStatus("SIGNED");
        contract.setSignedAt(LocalDateTime.now().minusDays(2));

        User client = new User(); // ← Changé: Client → User
        client.setId(10L);
        client.setFirstName("Jean");
        client.setLastName("Dupont");
        client.setEmail("jean.dupont@email.com");

        Car car = new Car();
        car.setId(20L);
        car.setBrand("Peugeot");
        car.setModel("308");
        car.setRegistrationNumber("XY-789-ZT");
        car.setColor("Noir");
        car.setMileage(25000);
        car.setFuelType(FuelType.DIESEL);
        car.setTransmission(TransmissionType.MANUAL);
        car.setSeats(5);

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setStartDate(LocalDateTime.now());
        reservation.setEndDate(LocalDateTime.now().plusDays(5));
        reservation.setPickupLocation("Aéroport CDG");
        reservation.setReturnLocation("Gare de Lyon");
        reservation.setPricePerDaySnapshot(BigDecimal.valueOf(95.00));
        reservation.setTotalAmount(BigDecimal.valueOf(475.00));
        reservation.setClient(client);
        reservation.setCar(car);

        contract.setReservation(reservation);
        contract.setCreatedAt(LocalDateTime.now());

        // When
        ContractResponse result = mapper.toResponse(contract);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getContractNumber()).isEqualTo("CT-2024-001");
        assertThat(result.getReservationId()).isEqualTo(100L);
        assertThat(result.getClientFirstName()).isEqualTo("Jean");
        assertThat(result.getClientLastName()).isEqualTo("Dupont");
        assertThat(result.getClientEmail()).isEqualTo("jean.dupont@email.com");
        assertThat(result.getCarBrand()).isEqualTo("Peugeot");
        assertThat(result.getCarModel()).isEqualTo("308");
        assertThat(result.getCarFuelType()).isEqualTo("DIESEL");
        assertThat(result.getCarTransmission()).isEqualTo("MANUAL");
        assertThat(result.getDailyRate()).isEqualTo(BigDecimal.valueOf(95.00));
        assertThat(result.getTotalAmount()).isEqualTo(BigDecimal.valueOf(475.00));
        assertThat(result.getDurationDays()).isEqualTo(5L);
    }

    @Test
    void toResponse_shouldHandleNullClientInReservation() {
        // Given
        Contract contract = new Contract();
        contract.setId(1L);

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setClient(null);
        reservation.setCar(new Car());
        reservation.setStartDate(LocalDateTime.now());
        reservation.setEndDate(LocalDateTime.now().plusDays(3));

        contract.setReservation(reservation);

        // When
        ContractResponse result = mapper.toResponse(contract);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getClientFirstName()).isNull();
        assertThat(result.getClientLastName()).isNull();
        assertThat(result.getClientEmail()).isNull();
    }

    @Test
    void toResponse_shouldHandleNullFieldsInCar() {
        // Given
        Contract contract = new Contract();
        contract.setId(1L);

        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setClient(new User()); // ← Changé: Client → User
        reservation.setCar(new Car());
        reservation.setStartDate(LocalDateTime.now());
        reservation.setEndDate(LocalDateTime.now().plusDays(3));

        contract.setReservation(reservation);

        // When
        ContractResponse result = mapper.toResponse(contract);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCarBrand()).isNull();
        assertThat(result.getCarModel()).isNull();
        assertThat(result.getCarRegistration()).isNull();
        assertThat(result.getCarColor()).isNull();
        assertThat(result.getCarMileage()).isNull();
        assertThat(result.getCarFuelType()).isNull();
        assertThat(result.getCarTransmission()).isNull();
        assertThat(result.getCarSeats()).isNull();
    }
}