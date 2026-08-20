package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.PublicStatsResponse;
import com.rentcar.rent_car.service.PublicStatsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicStatsControllerTest {

    @Mock
    private PublicStatsService publicStatsService;

    @InjectMocks
    private PublicStatsController publicStatsController;

    @Test
    void shouldReturnPublicStats() {
        PublicStatsResponse stats = PublicStatsResponse.builder()
                .vehicles(12L)
                .clients(37L)
                .reviews(9L)
                .averageRating(4.3)
                .build();
        when(publicStatsService.getPublicStats()).thenReturn(stats);

        ResponseEntity<PublicStatsResponse> response = publicStatsController.getPublicStats();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(stats);
    }
}
