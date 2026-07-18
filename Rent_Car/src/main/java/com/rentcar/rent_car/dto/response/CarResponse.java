package com.rentcar.rent_car.dto.response;

import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.FuelType;
import com.rentcar.rent_car.enums.Transmission;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CarResponse {

    private Long id;
    private String brand;
    private String model;
    private Integer year;
    private String registrationNumber;
    private String color;
    private Integer mileage;
    private Integer seats;
    private FuelType fuelType;
    private Transmission transmission;
    private BigDecimal dailyRate;
    private CarStatus status;
    private String description;
    private String categoryName;
    private Long categoryId;
    private Boolean isActive;
    private Double averageRating;
    private Integer reviewCount;
    private LocalDateTime createdAt;
    private List<String> images;              // URLs des images
    private String primaryImage;
}