package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.DashboardResponse;
import com.rentcar.rent_car.dto.response.RevenueResponse;
import com.rentcar.rent_car.dto.response.TopCarResponse;
import com.rentcar.rent_car.service.DashboardService;
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
class DashboardControllerTest {

    @Mock
    private DashboardService dashboardService;

    @InjectMocks
    private DashboardController dashboardController;

    @Test
    void shouldGetDashboardStats() {
        when(dashboardService.getDashboardStats()).thenReturn(new DashboardResponse());

        ResponseEntity<DashboardResponse> response = dashboardController.getDashboard();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldGetRevenue() {
        when(dashboardService.getRevenueByYear(2026)).thenReturn(List.of(new RevenueResponse()));

        ResponseEntity<List<RevenueResponse>> response = dashboardController.getRevenue(2026);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldGetTopCars() {
        when(dashboardService.getTopCars(5)).thenReturn(List.of(new TopCarResponse()));

        ResponseEntity<List<TopCarResponse>> response = dashboardController.getTopCars(5);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }
}
