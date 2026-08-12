package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.CalendarReservationResponse;
import com.rentcar.rent_car.service.CalendarService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CalendarControllerTest {

    @Mock
    private CalendarService calendarService;

    @InjectMocks
    private CalendarController calendarController;

    @Test
    void shouldGetReservationsForMonth() {
        when(calendarService.getReservationsForMonth(2026, 8))
                .thenReturn(List.of(new CalendarReservationResponse()));

        ResponseEntity<List<CalendarReservationResponse>> response = calendarController.getReservationsForMonth(2026, 8);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }
}
