package com.rentcar.rent_car.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompleteReservationRequest {

    @NotNull(message = "Le kilométrage de retour est obligatoire")
    @Positive(message = "Le kilométrage doit être positif")
    private Integer mileageEnd;

    @NotNull(message = "Le niveau de carburant est obligatoire")
    private String fuelLevelEnd;

    private String damagesAtEnd;     // Nouveaux dégâts constatés au retour
}