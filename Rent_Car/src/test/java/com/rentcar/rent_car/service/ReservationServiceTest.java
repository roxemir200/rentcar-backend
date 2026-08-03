package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.mapper.CarMapper;
import com.rentcar.rent_car.dto.mapper.ReservationMapper;
import com.rentcar.rent_car.dto.request.ReservationRequest;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.ReservationResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.enums.Role;
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
    private Car car;

    @BeforeEach
    void setUp() {
        client = new User();
        client.setId(1L);
        client.setEmail("client@test.com");
        client.setRole(Role.CLIENT);
        client.setFirstName("Alice");
        client.setLastName("Durand");

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
        when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of());
        when(reservationMapper.toResponse(reservation)).thenReturn(new ReservationResponse());

        MessageResponse result = reservationService.createReservation(request, "client@test.com");

        assertThat(result.isSuccess()).isTrue();
        verify(reservationRepository).save(any(Reservation.class));
    }

    @Test
    void shouldReturnMyReservations_forClient() {
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(reservationRepository.findByClientId(1L)).thenReturn(List.of(reservation));
        when(reservationMapper.toResponse(reservation)).thenReturn(new ReservationResponse());

        List<ReservationResponse> result = reservationService.getMyReservations("client@test.com");

        assertThat(result).hasSize(1);
    }

    @Test
    void shouldCancelReservation_whenAllowed() {
        reservation.setStatus(ReservationStatus.PENDING);
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(reservationRepository.save(any(Reservation.class))).thenReturn(reservation);
        when(carRepository.save(any(Car.class))).thenReturn(car);
        when(reservationMapper.toResponse(reservation)).thenReturn(new ReservationResponse());

        MessageResponse result = reservationService.cancelReservation(100L, "client@test.com");

        assertThat(result.isSuccess()).isTrue();
        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
    }
}
