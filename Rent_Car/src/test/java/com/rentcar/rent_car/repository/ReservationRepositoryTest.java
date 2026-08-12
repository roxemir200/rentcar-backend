package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.enums.ReservationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationRepositoryTest {

    @Mock
    private ReservationRepository reservationRepository;

    private Reservation reservation;

    @BeforeEach
    void setUp() {
        reservation = new Reservation();
        reservation.setId(100L);
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setStartDate(LocalDate.of(2026, 8, 10));
        reservation.setEndDate(LocalDate.of(2026, 8, 15));
    }

    @Test
    void shouldFindByClientId() {
        when(reservationRepository.findByClientId(1L)).thenReturn(List.of(reservation));

        List<Reservation> list = reservationRepository.findByClientId(1L);

        assertThat(list).hasSize(1);
    }

    @Test
    void shouldFindByCarId() {
        when(reservationRepository.findByCarId(10L)).thenReturn(List.of(reservation));

        List<Reservation> list = reservationRepository.findByCarId(10L);

        assertThat(list).hasSize(1);
    }

    @Test
    void shouldFindByStatus() {
        when(reservationRepository.findByStatus(ReservationStatus.CONFIRMED)).thenReturn(List.of(reservation));

        List<Reservation> list = reservationRepository.findByStatus(ReservationStatus.CONFIRMED);

        assertThat(list).hasSize(1);
    }

    @Test
    void shouldFindByClientIdAndStatus() {
        when(reservationRepository.findByClientIdAndStatus(1L, ReservationStatus.CONFIRMED)).thenReturn(List.of(reservation));

        List<Reservation> list = reservationRepository.findByClientIdAndStatus(1L, ReservationStatus.CONFIRMED);

        assertThat(list).hasSize(1);
    }

    @Test
    void shouldCheckIsCarUnavailable() {
        when(reservationRepository.isCarUnavailable(eq(10L), any(LocalDate.class), any(LocalDate.class), anyList()))
                .thenReturn(true);

        boolean unavailable = reservationRepository.isCarUnavailable(
                10L, LocalDate.of(2026, 8, 12), LocalDate.of(2026, 8, 18),
                List.of(ReservationStatus.CONFIRMED)
        );

        assertThat(unavailable).isTrue();
    }

    @Test
    void shouldFindActiveReservationsByClientId() {
        when(reservationRepository.findActiveReservationsByClientId(eq(1L), anyList()))
                .thenReturn(List.of(reservation));

        List<Reservation> active = reservationRepository.findActiveReservationsByClientId(
                1L, List.of(ReservationStatus.CONFIRMED)
        );

        assertThat(active).hasSize(1);
    }

    @Test
    void shouldFindByStartDateBetween() {
        when(reservationRepository.findByStartDateBetween(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(reservation));

        List<Reservation> list = reservationRepository.findByStartDateBetween(
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 11)
        );

        assertThat(list).hasSize(1);
    }

    @Test
    void shouldFindReservationsBetweenDates() {
        when(reservationRepository.findReservationsBetweenDates(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(reservation));

        List<Reservation> list = reservationRepository.findReservationsBetweenDates(
                LocalDate.of(2026, 8, 12), LocalDate.of(2026, 8, 20)
        );

        assertThat(list).hasSize(1);
    }
}
