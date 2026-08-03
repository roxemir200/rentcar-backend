package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.mapper.CarMapper;
import com.rentcar.rent_car.dto.request.CarRequest;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarCategory;
import com.rentcar.rent_car.entity.CarImage;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.repository.CarImageRepository;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.service.impl.CarServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CarServiceTest {

    @Mock
    private CarRepository carRepository;

    @Mock
    private CarImageRepository carImageRepository;

    @Mock
    private CarMapper carMapper;

    @InjectMocks
    private CarServiceImpl carService;

    private Car car;
    private CarRequest request;

    @BeforeEach
    void setUp() {
        car = new Car();
        car.setId(1L);
        car.setBrand("BMW");
        car.setModel("X5");
        car.setStatus(CarStatus.AVAILABLE);
        car.setIsActive(true);
        car.setDailyRate(new BigDecimal("120"));

        CarCategory category = new CarCategory();
        category.setId(2L);
        category.setName("SUV");
        car.setCategory(category);

        request = new CarRequest();
        request.setBrand("BMW");
        request.setModel("X5");
        request.setMileage(5000);
        request.setSeats(5);
        request.setDailyRate(new BigDecimal("120"));
        request.setCategoryId(2L);
        request.setImageUrls(List.of("img1.jpg"));
    }

    @Test
    void shouldReturnCarList_whenCarsExist() {
        CarResponse response = CarResponse.builder().id(1L).brand("BMW").build();
        when(carRepository.findByIsActiveTrue()).thenReturn(List.of(car));
        when(carMapper.toResponse(car)).thenReturn(response);

        List<CarResponse> result = carService.getAllCars();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getBrand()).isEqualTo("BMW");
    }

    @Test
    void shouldReturnCar_whenCarExists() {
        CarResponse response = CarResponse.builder().id(1L).brand("BMW").build();
        when(carRepository.findById(1L)).thenReturn(Optional.of(car));
        when(carMapper.toResponse(car)).thenReturn(response);

        CarResponse result = carService.getCarById(1L);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getBrand()).isEqualTo("BMW");
    }

    @Test
    void shouldThrow_whenCarDoesNotExist() {
        when(carRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> carService.getCarById(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Voiture non trouvée");
    }

    @Test
    void shouldCreateCarAndSaveImages() {
        CarResponse response = CarResponse.builder().id(1L).brand("BMW").build();
        when(carMapper.toEntity(request)).thenReturn(car);
        when(carRepository.save(any(Car.class))).thenReturn(car);
        when(carMapper.toResponse(car)).thenReturn(response);

        MessageResponse result = carService.createCar(request);

        assertThat(result.isSuccess()).isTrue();
        verify(carRepository).save(any(Car.class));
        verify(carImageRepository).save(any(CarImage.class));
    }

    @Test
    void shouldUpdateCar_whenCarExists() {
        CarResponse response = CarResponse.builder().id(1L).brand("BMW").build();
        when(carRepository.findById(1L)).thenReturn(Optional.of(car));
        when(carMapper.toResponse(car)).thenReturn(response);

        MessageResponse result = carService.updateCar(1L, request);

        assertThat(result.isSuccess()).isTrue();
        verify(carRepository).save(car);
    }

    @Test
    void shouldThrow_whenUpdatingMissingCar() {
        when(carRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> carService.updateCar(99L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Voiture non trouvée");
    }

    @Test
    void shouldDeleteCarLogically() {
        when(carRepository.findById(1L)).thenReturn(Optional.of(car));
        when(carRepository.save(any(Car.class))).thenReturn(car);

        MessageResponse result = carService.deleteCar(1L);

        assertThat(result.isSuccess()).isTrue();
        assertThat(car.getIsActive()).isFalse();
    }

    @Test
    void shouldThrow_whenDeletingMissingCar() {
        when(carRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> carService.deleteCar(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Voiture non trouvée");
    }

    @Test
    void shouldReturnFilteredCarsByCategory() {
        CarResponse response = CarResponse.builder().id(1L).brand("BMW").build();
        when(carRepository.findByCategoryId(2L)).thenReturn(List.of(car));
        when(carMapper.toResponse(car)).thenReturn(response);

        List<CarResponse> result = carService.getCarsByCategory(2L);

        assertThat(result).hasSize(1);
    }
}
