package com.rentcar.rent_car.dto.request;

import com.rentcar.rent_car.enums.FuelType;
import com.rentcar.rent_car.enums.Transmission;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CarRequest {

    @NotBlank(message = "La marque est obligatoire")
    private String brand;

    @NotBlank(message = "Le modèle est obligatoire")
    private String model;

    private Integer year;

    @NotBlank(message = "Le numéro d'immatriculation est obligatoire")
    private String registrationNumber;

    private String color;

    @NotNull(message = "Le kilométrage est obligatoire")
    @Positive(message = "Le kilométrage doit être positif")
    private Integer mileage;

    @NotNull(message = "Le nombre de places est obligatoire")
    @Positive(message = "Le nombre de places doit être positif")
    private Integer seats;

    @NotNull(message = "Le type de carburant est obligatoire")
    private FuelType fuelType;

    @NotNull(message = "Le type de transmission est obligatoire")
    private Transmission transmission;

    @NotNull(message = "Le tarif journalier est obligatoire")
    @Positive(message = "Le tarif doit être positif")
    private BigDecimal dailyRate;

    private String description;

    @NotNull(message = "La catégorie est obligatoire")
    private Long categoryId;
}