package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.DashboardResponse;
import com.rentcar.rent_car.dto.response.RevenueResponse;
import com.rentcar.rent_car.dto.response.TopCarResponse;
import com.rentcar.rent_car.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * Tableau de bord - Statistiques globales
     */
    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard() {
        return ResponseEntity.ok(dashboardService.getDashboardStats());
    }

    /**
     * Revenus par mois pour une année
     */
    @GetMapping("/revenue")
    public ResponseEntity<List<RevenueResponse>> getRevenue(
            @RequestParam(defaultValue = "2026") int year) {
        return ResponseEntity.ok(dashboardService.getRevenueByYear(year));
    }

    /**
     * Top voitures les plus louées
     */
    @GetMapping("/top-cars")
    public ResponseEntity<List<TopCarResponse>> getTopCars(
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(dashboardService.getTopCars(limit));
    }
}