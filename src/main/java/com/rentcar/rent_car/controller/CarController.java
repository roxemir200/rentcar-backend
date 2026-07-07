package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.CarRequest;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.service.CarService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CarController {

    private final CarService carService;

    // ========== ROUTES PUBLIQUES ==========

    @GetMapping("/cars")
    public ResponseEntity<List<CarResponse>> getAllCars() {
        return ResponseEntity.ok(carService.getAllCars());
    }

    @GetMapping("/cars/available")
    public ResponseEntity<List<CarResponse>> getAvailableCars() {
        return ResponseEntity.ok(carService.getAvailableCars());
    }

    @GetMapping("/cars/{id}")
    public ResponseEntity<CarResponse> getCarById(@PathVariable Long id) {
        return ResponseEntity.ok(carService.getCarById(id));
    }

    @GetMapping("/cars/category/{categoryId}")
    public ResponseEntity<List<CarResponse>> getCarsByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(carService.getCarsByCategory(categoryId));
    }

    @GetMapping("/cars/search")
    public ResponseEntity<List<CarResponse>> searchCars(
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String fuelType,
            @RequestParam(required = false) String transmission,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice) {
        return ResponseEntity.ok(carService.searchCars(brand, fuelType, transmission, minPrice, maxPrice));
    }

    // ========== ROUTES ADMIN ==========

    @PostMapping("/admin/cars")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> createCar(@Valid @RequestBody CarRequest request) {
        MessageResponse response = carService.createCar(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/admin/cars/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> updateCar(@PathVariable Long id,
                                                     @Valid @RequestBody CarRequest request) {
        return ResponseEntity.ok(carService.updateCar(id, request));
    }

    @DeleteMapping("/admin/cars/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> deleteCar(@PathVariable Long id) {
        MessageResponse response = carService.deleteCar(id);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }
}