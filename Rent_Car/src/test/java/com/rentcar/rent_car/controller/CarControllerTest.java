package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.CarRequest;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
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
import static org.mockito.ArgumentMatchers.*;
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
    void shouldReturnAvailableCars() {
        when(carService.getAvailableCars()).thenReturn(List.of(CarResponse.builder().id(1L).brand("BMW").build()));

        ResponseEntity<List<CarResponse>> response = carController.getAvailableCars();

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

    @Test
    void shouldReturnCarsByCategory() {
        when(carService.getCarsByCategory(2L)).thenReturn(List.of(CarResponse.builder().id(1L).brand("BMW").build()));

        ResponseEntity<List<CarResponse>> response = carController.getCarsByCategory(2L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldSearchCars() {
        when(carService.searchCars(eq("BMW"), eq("DIESEL"), eq("AUTOMATIC"), eq(50.0), eq(200.0)))
                .thenReturn(List.of(CarResponse.builder().id(1L).brand("BMW").build()));

        ResponseEntity<List<CarResponse>> response = carController.searchCars("BMW", "DIESEL", "AUTOMATIC", 50.0, 200.0);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldCreateCar_whenSuccess() {
        when(carService.createCar(any(CarRequest.class))).thenReturn(MessageResponse.success("Créée avec succès"));

        ResponseEntity<MessageResponse> response = carController.createCar(new CarRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().isSuccess()).isTrue();
    }

    @Test
    void shouldCreateCar_whenError() {
        when(carService.createCar(any(CarRequest.class))).thenReturn(MessageResponse.error("Erreur de création"));

        ResponseEntity<MessageResponse> response = carController.createCar(new CarRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().isSuccess()).isFalse();
    }

    @Test
    void shouldUpdateCar() {
        when(carService.updateCar(eq(1L), any(CarRequest.class))).thenReturn(MessageResponse.success("Mise à jour"));

        ResponseEntity<MessageResponse> response = carController.updateCar(1L, new CarRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldDeleteCar_whenSuccess() {
        when(carService.deleteCar(1L)).thenReturn(MessageResponse.success("Supprimée"));

        ResponseEntity<MessageResponse> response = carController.deleteCar(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldDeleteCar_whenError() {
        when(carService.deleteCar(99L)).thenReturn(MessageResponse.error("Introuvable"));

        ResponseEntity<MessageResponse> response = carController.deleteCar(99L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}

