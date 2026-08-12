package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.mapper.CalendarReservationMapper;
import com.rentcar.rent_car.dto.response.CalendarReservationResponse;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.service.imp.CalendarServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CalendarServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private CalendarReservationMapper calendarReservationMapper;

    @InjectMocks
    private CalendarServiceImpl calendarService;

    @Test
    void shouldGetReservationsForMonth() {
        int year = 2026;
        int month = 2; // February 2026 (28 days)
        LocalDate startDate = LocalDate.of(2026, 2, 1);
        LocalDate endDate = LocalDate.of(2026, 2, 28);

        Reservation reservation = new Reservation();
        CalendarReservationResponse dto = new CalendarReservationResponse();

        when(reservationRepository.findReservationsBetweenDates(eq(startDate), eq(endDate)))
                .thenReturn(List.of(reservation));
        when(calendarReservationMapper.mapToResponse(reservation)).thenReturn(dto);

        List<CalendarReservationResponse> result = calendarService.getReservationsForMonth(year, month);

        assertThat(result).hasSize(1);
    }
}
