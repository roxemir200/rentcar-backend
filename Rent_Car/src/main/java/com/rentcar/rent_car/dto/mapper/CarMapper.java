package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.CarRequest;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarImage;
import com.rentcar.rent_car.entity.CarCategory;
import com.rentcar.rent_car.repository.CarCategoryRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class CarMapper {

    private final CarCategoryRepository categoryRepository;

    public Car toEntity(CarRequest request) {
        Car car = new Car();
        car.setBrand(request.getBrand());
        car.setModel(request.getModel());
        car.setYear(request.getYear());
        car.setRegistrationNumber(request.getRegistrationNumber());
        car.setColor(request.getColor());
        car.setMileage(request.getMileage());
        car.setSeats(request.getSeats());
        car.setFuelType(request.getFuelType());
        car.setTransmission(request.getTransmission());
        car.setDailyRate(request.getDailyRate());
        car.setDescription(request.getDescription());

        // Associer la catégorie
        CarCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));
        car.setCategory(category);

        return car;
    }

    public CarResponse toResponse(Car car) {
        // Extraire les URLs des images
        List<String> imageUrls = car.getImages() != null ?
                car.getImages().stream()
                        .map(CarImage::getImageUrl)
                        .collect(Collectors.toList()) :
                List.of();

        // Trouver l'image primaire
        String primaryImage = car.getImages() != null ?
                car.getImages().stream()
                        .filter(img -> img != null && Boolean.TRUE.equals(img.getIsPrimary()))
                        .findFirst()
                        .map(CarImage::getImageUrl)
                        .orElse(null) :
                null;

        return CarResponse.builder()
                .id(car.getId())
                .brand(car.getBrand())
                .model(car.getModel())
                .year(car.getYear())
                .registrationNumber(car.getRegistrationNumber())
                .color(car.getColor())
                .mileage(car.getMileage())
                .seats(car.getSeats())
                .fuelType(car.getFuelType())
                .transmission(car.getTransmission())
                .dailyRate(car.getDailyRate())
                .status(car.getStatus())
                .description(car.getDescription())
                .categoryName(car.getCategory() != null ? car.getCategory().getName() : null)
                .categoryId(car.getCategory() != null ? car.getCategory().getId() : null)
                .isActive(car.getIsActive())
                .averageRating(car.getAverageRating())
                .reviewCount(car.getReviews() != null ? car.getReviews().size() : 0)
                .createdAt(car.getCreatedAt())
                .images(imageUrls)           // ← AJOUTÉ
                .primaryImage(primaryImage)  // ← AJOUTÉ
                .build();
    }

    public void updateEntity(Car car, CarRequest request) {
        car.setBrand(request.getBrand());
        car.setModel(request.getModel());
        car.setYear(request.getYear());
        car.setRegistrationNumber(request.getRegistrationNumber());
        car.setColor(request.getColor());
        car.setMileage(request.getMileage());
        car.setSeats(request.getSeats());
        car.setFuelType(request.getFuelType());
        car.setTransmission(request.getTransmission());
        car.setDailyRate(request.getDailyRate());
        car.setDescription(request.getDescription());

        if (request.getCategoryId() != null) {
            CarCategory category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));
            car.setCategory(category);
        }
    }
}