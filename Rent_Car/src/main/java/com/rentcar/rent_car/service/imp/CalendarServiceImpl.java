// service/impl/CalendarServiceImpl.java
package com.rentcar.rent_car.service.impl;

import com.rentcar.rent_car.dto.response.CalendarReservationResponse;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.service.CalendarService;
import com.rentcar.rent_car.dto.mapper.CalendarReservationMapper; // Changé l'import

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CalendarServiceImpl implements CalendarService {

    private final ReservationRepository reservationRepository;
    private final CalendarReservationMapper calendarReservationMapper; // Changé le mapper

    @Override
    public List<CalendarReservationResponse> getReservationsForMonth(int year, int month) {
        // 1. Calculer le premier et dernier jour du mois
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        // 2. Récupérer les réservations du mois
        List<Reservation> reservations = reservationRepository
                .findReservationsBetweenDates(startDate, endDate);

        // 3. Mapper vers le DTO
        return reservations.stream()
                .map(calendarReservationMapper::mapToResponse)
                .collect(Collectors.toList());
    }
}