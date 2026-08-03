package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.service.CarService;
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
class CarControllerTest {

    @Mock
    private CarService carService;

    @InjectMocks
    private CarController carController;

    @Test
    void shouldReturnCars_whenServiceReturnsData() {
        when(carService.getAllCars()).thenReturn(List.of(CarResponse.builder().id(1L).brand("BMW").build()));

        ResponseEntity<List<CarResponse>> response = carController.getAllCars();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldReturnCar_whenIdExists() {
        when(carService.getCarById(1L)).thenReturn(CarResponse.builder().id(1L).brand("BMW").build());

        ResponseEntity<CarResponse> response = carController.getCarById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getBrand()).isEqualTo("BMW");
    }
}
