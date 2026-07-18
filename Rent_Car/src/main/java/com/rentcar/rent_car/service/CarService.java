package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.request.CarRequest;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;

import java.util.List;

public interface CarService {

    List<CarResponse> getAllCars();

    List<CarResponse> getAvailableCars();

    CarResponse getCarById(Long id);

    List<CarResponse> getCarsByCategory(Long categoryId);

    List<CarResponse> searchCars(String brand, String fuelType, String transmission,
                                 Double minPrice, Double maxPrice);

    MessageResponse createCar(CarRequest request);

    MessageResponse updateCar(Long id, CarRequest request);

    MessageResponse deleteCar(Long id);
}