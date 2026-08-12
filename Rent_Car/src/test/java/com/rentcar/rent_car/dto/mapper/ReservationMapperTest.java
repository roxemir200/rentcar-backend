package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.ReservationRequest;
import com.rentcar.rent_car.dto.response.ReservationResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationMapperTest {

    @Mock
    private CarRepository carRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ReservationMapper reservationMapper;

    private User client;
    private Car car;
    private ReservationRequest request;

    @BeforeEach
    void setUp() {
        client = new User();
        client.setId(1L);
        client.setEmail("client@test.com");
        client.setFirstName("Jean");
        client.setLastName("Dupont");

        car = new Car();
        car.setId(10L);
        car.setBrand("Renault");
        car.setModel("Clio");
        car.setRegistrationNumber("AB-123-CD");
        car.setDailyRate(new BigDecimal("50.00"));

        request = new ReservationRequest();
        request.setCarId(10L);
        request.setStartDate(LocalDate.of(2026, 8, 1));
        request.setEndDate(LocalDate.of(2026, 8, 4)); // 3 jours
        request.setPickupLocation("Paris");
        request.setReturnLocation("Paris");
        request.setAdditionalNotes("Siège bébé");
    }

    @Test
    void shouldToEntity_whenClientAndCarExist() {
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(carRepository.findById(10L)).thenReturn(Optional.of(car));

        Reservation reservation = reservationMapper.toEntity(request, "client@test.com");

        assertThat(reservation.getClient()).isEqualTo(client);
        assertThat(reservation.getCar()).isEqualTo(car);
        assertThat(reservation.getPricePerDaySnapshot()).isEqualTo(new BigDecimal("50.00"));
        assertThat(reservation.getTotalAmount()).isEqualTo(new BigDecimal("150.00")); // 50 * 3
    }

    @Test
    void shouldThrow_whenClientNotFoundInToEntity() {
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reservationMapper.toEntity(request, "client@test.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Client non trouvé");
    }

    @Test
    void shouldThrow_whenCarNotFoundInToEntity() {
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(carRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reservationMapper.toEntity(request, "client@test.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Voiture non trouvée");
    }

    @Test
    void shouldToResponse_withFullDetails() {
        LocalDateTime now = LocalDateTime.now();
        Reservation reservation = new Reservation();
        reservation.setId(100L);
        reservation.setStartDate(LocalDate.of(2026, 8, 1));
        reservation.setEndDate(LocalDate.of(2026, 8, 4));
        reservation.setPickupLocation("Paris");
        reservation.setReturnLocation("Paris");
        reservation.setPricePerDaySnapshot(new BigDecimal("50.00"));
        reservation.setTotalAmount(new BigDecimal("150.00"));
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setCar(car);
        reservation.setClient(client);
        reservation.setAdditionalNotes("Siège bébé");
        reservation.setMileageStart(10000);
        reservation.setMileageEnd(10500);
        reservation.setFuelLevelStart("100%");
        reservation.setFuelLevelEnd("90%");
        reservation.setDamagesAtStart("Aucun");
        reservation.setDamagesAtEnd("Rayure");
        reservation.setCreatedAt(now);

        ReservationResponse response = reservationMapper.toResponse(reservation);

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getCarBrand()).isEqualTo("Renault");
        assertThat(response.getCarModel()).isEqualTo("Clio");
        assertThat(response.getClientFirstName()).isEqualTo("Jean");
        assertThat(response.getClientLastName()).isEqualTo("Dupont");
        assertThat(response.getMileageStart()).isEqualTo(10000);
        assertThat(response.getDamagesAtEnd()).isEqualTo("Rayure");
    }

    @Test
    void shouldToResponse_withNullCarAndNullClient() {
        Reservation reservation = new Reservation();
        reservation.setId(101L);

        ReservationResponse response = reservationMapper.toResponse(reservation);

        assertThat(response.getId()).isEqualTo(101L);
        assertThat(response.getCarBrand()).isNull();
        assertThat(response.getCarModel()).isNull();
        assertThat(response.getCarRegistrationNumber()).isNull();
        assertThat(response.getCarId()).isNull();
        assertThat(response.getClientFirstName()).isNull();
        assertThat(response.getClientLastName()).isNull();
        assertThat(response.getClientEmail()).isNull();
        assertThat(response.getClientId()).isNull();
    }
}
