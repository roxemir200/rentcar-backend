package com.rentcar.rent_car.service.impl;

import com.rentcar.rent_car.dto.mapper.CarMapper;
import com.rentcar.rent_car.dto.request.CarRequest;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarImage;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.FuelType;
import com.rentcar.rent_car.enums.Transmission;
import com.rentcar.rent_car.repository.CarImageRepository;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.service.CarService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CarServiceImpl implements CarService {
    private final CarImageRepository carImageRepository;  // ← AJOUTER

    private final CarRepository carRepository;
    private final CarMapper carMapper;

    @Override
    public List<CarResponse> getAllCars() {
        return carRepository.findByIsActiveTrue()
                .stream()
                .map(carMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<CarResponse> getAvailableCars() {
        return carRepository.findByStatus(CarStatus.AVAILABLE)
                .stream()
                .map(carMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CarResponse getCarById(Long id) {
        Car car = carRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Voiture non trouvée avec l'id : " + id));
        return carMapper.toResponse(car);
    }

    @Override
    public List<CarResponse> getCarsByCategory(Long categoryId) {
        return carRepository.findByCategoryId(categoryId)
                .stream()
                .map(carMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<CarResponse> searchCars(String brand, String fuelType, String transmission,
                                        Double minPrice, Double maxPrice) {
        FuelType fuel = fuelType != null ? FuelType.valueOf(fuelType.toUpperCase()) : null;
        Transmission trans = transmission != null ? Transmission.valueOf(transmission.toUpperCase()) : null;
        BigDecimal min = minPrice != null ? BigDecimal.valueOf(minPrice) : null;
        BigDecimal max = maxPrice != null ? BigDecimal.valueOf(maxPrice) : null;

        return carRepository.searchCars(brand, fuel, trans, min, max, CarStatus.AVAILABLE)
                .stream()
                .map(carMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MessageResponse createCar(CarRequest request) {
        Car car = carMapper.toEntity(request);
        car.setStatus(CarStatus.AVAILABLE);
        car.setIsActive(true);
        carRepository.save(car);  // ← Sauvegarder d'abord pour avoir l'ID

        // ✅ Ajouter les images
        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            for (int i = 0; i < request.getImageUrls().size(); i++) {
                String imageUrl = request.getImageUrls().get(i);
                boolean isPrimary = (i == 0);  // La première image est principale

                CarImage image = new CarImage();
                image.setImageUrl(imageUrl);
                image.setIsPrimary(isPrimary);
                image.setCar(car);
                carImageRepository.save(image);
            }
        }

        return MessageResponse.success("Voiture créée avec succès", carMapper.toResponse(car));
    }

    @Override
    @Transactional
    public MessageResponse updateCar(Long id, CarRequest request) {
        Car car = carRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Voiture non trouvée avec l'id : " + id));

        carMapper.updateEntity(car, request);
        carRepository.save(car);

        // ✅ Gérer les images
        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            carImageRepository.deleteByCarId(id);  // ← Supprimer les anciennes

            for (int i = 0; i < request.getImageUrls().size(); i++) {
                String imageUrl = request.getImageUrls().get(i);
                boolean isPrimary = (i == 0);

                CarImage image = new CarImage();
                image.setImageUrl(imageUrl);
                image.setIsPrimary(isPrimary);
                image.setCar(car);
                carImageRepository.save(image);
            }
        }

        return MessageResponse.success("Voiture mise à jour avec succès", carMapper.toResponse(car));
    }

    @Override
    public MessageResponse deleteCar(Long id) {
        Car car = carRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Voiture non trouvée avec l'id : " + id));

        // Suppression logique
        car.setIsActive(false);
        carRepository.save(car);

        return MessageResponse.success("Voiture supprimée avec succès");
    }
}