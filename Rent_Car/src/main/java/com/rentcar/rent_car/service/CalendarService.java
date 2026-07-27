// service/CalendarService.java
package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.response.CalendarReservationResponse;
import java.time.LocalDate;
import java.util.List;

public interface CalendarService {
    List<CalendarReservationResponse> getReservationsForMonth(int year, int month);
}