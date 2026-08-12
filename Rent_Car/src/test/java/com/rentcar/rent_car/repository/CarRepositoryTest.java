package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarCategory;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.FuelType;
import com.rentcar.rent_car.enums.Transmission;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CarRepositoryTest {

    @Mock
    private CarRepository carRepository;

    private Car car1;

    @BeforeEach
    void setUp() {
        CarCategory category = new CarCategory();
        category.setId(2L);
        category.setName("BERLINE");

        car1 = new Car();
        car1.setId(1L);
        car1.setBrand("BMW");
        car1.setModel("Serie 3");
        car1.setCategory(category);
        car1.setStatus(CarStatus.AVAILABLE);
        car1.setFuelType(FuelType.DIESEL);
        car1.setTransmission(Transmission.AUTOMATIC);
        car1.setDailyRate(new BigDecimal("100.00"));
        car1.setIsActive(true);
    }

    @Test
    void shouldFindByStatus() {
        when(carRepository.findByStatus(CarStatus.AVAILABLE)).thenReturn(List.of(car1));

        List<Car> availableCars = carRepository.findByStatus(CarStatus.AVAILABLE);

        assertThat(availableCars).hasSize(1);
        assertThat(availableCars.get(0).getBrand()).isEqualTo("BMW");
    }

    @Test
    void shouldFindByCategoryId() {
        when(carRepository.findByCategoryId(2L)).thenReturn(List.of(car1));

        List<Car> categoryCars = carRepository.findByCategoryId(2L);

        assertThat(categoryCars).hasSize(1);
    }

    @Test
    void shouldFindByBrandIgnoreCase() {
        when(carRepository.findByBrandIgnoreCase("bmw")).thenReturn(List.of(car1));

        List<Car> bmwCars = carRepository.findByBrandIgnoreCase("bmw");

        assertThat(bmwCars).hasSize(1);
    }

    @Test
    void shouldFindByFuelType() {
        when(carRepository.findByFuelType(FuelType.DIESEL)).thenReturn(List.of(car1));

        List<Car> dieselCars = carRepository.findByFuelType(FuelType.DIESEL);

        assertThat(dieselCars).hasSize(1);
    }

    @Test
    void shouldFindByTransmission() {
        when(carRepository.findByTransmission(Transmission.AUTOMATIC)).thenReturn(List.of(car1));

        List<Car> manualCars = carRepository.findByTransmission(Transmission.AUTOMATIC);

        assertThat(manualCars).hasSize(1);
    }

    @Test
    void shouldFindByDailyRateBetween() {
        when(carRepository.findByDailyRateBetween(eq(new BigDecimal("50.00")), eq(new BigDecimal("150.00"))))
                .thenReturn(List.of(car1));

        List<Car> carsInRange = carRepository.findByDailyRateBetween(new BigDecimal("50.00"), new BigDecimal("150.00"));

        assertThat(carsInRange).hasSize(1);
    }

    @Test
    void shouldFindByIsActiveTrue() {
        when(carRepository.findByIsActiveTrue()).thenReturn(List.of(car1));

        List<Car> activeCars = carRepository.findByIsActiveTrue();

        assertThat(activeCars).hasSize(1);
    }

    @Test
    void shouldSearchCars() {
        when(carRepository.searchCars("BMW", FuelType.DIESEL, Transmission.AUTOMATIC,
                new BigDecimal("50"), new BigDecimal("150"), CarStatus.AVAILABLE)).thenReturn(List.of(car1));

        List<Car> search = carRepository.searchCars("BMW", FuelType.DIESEL, Transmission.AUTOMATIC,
                new BigDecimal("50"), new BigDecimal("150"), CarStatus.AVAILABLE);

        assertThat(search).hasSize(1);
    }
}
