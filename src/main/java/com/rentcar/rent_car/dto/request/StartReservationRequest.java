package com.rentcar.rent_car.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StartReservationRequest {

    @NotNull(message = "Le kilométrage de départ est obligatoire")
    @Positive(message = "Le kilométrage doit être positif")
    private Integer mileageStart;

    @NotNull(message = "Le niveau de carburant est obligatoire")
    private String fuelLevelStart;

    private String damagesAtStart;   // Dégâts existants notés au départ
}