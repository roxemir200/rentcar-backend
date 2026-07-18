package com.rentcar.rent_car.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CarCategoryRequest {

    @NotBlank(message = "Le nom de la catégorie est obligatoire")
    private String name;

    private String description;
}