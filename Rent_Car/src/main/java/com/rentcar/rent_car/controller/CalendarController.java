// controller/CalendarController.java
package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.CalendarReservationResponse;
import com.rentcar.rent_car.service.CalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/calendar")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class CalendarController {

    private final CalendarService calendarService;

    /**
     * Récupérer les réservations pour un mois spécifique
     * GET /api/admin/calendar/reservations?year=2026&month=7
     */
    @GetMapping("/reservations")
    public ResponseEntity<List<CalendarReservationResponse>> getReservationsForMonth(
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(calendarService.getReservationsForMonth(year, month));
    }
}