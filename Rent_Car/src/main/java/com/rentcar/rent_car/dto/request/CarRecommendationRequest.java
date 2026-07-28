package com.rentcar.rent_car.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CarRecommendationRequest {

    @NotBlank(message = "L'objectif est requis")
    @Pattern(
            regexp = "^(QUOTIDIEN|FAMILLE|PROFESSIONNEL|AVENTURE|CONFORT|ECOLOGIQUE)$",
            message = "Objectif invalide"
    )
    private String objective;

    @DecimalMin(value = "0.0", inclusive = false, message = "Le budget doit être supérieur à 0")
    private BigDecimal budget;

    @Min(value = 1, message = "Au moins 1 passager")
    @Max(value = 7, message = "Maximum 7 passagers")
    private Integer passengers;

    @Min(value = 1, message = "Durée minimum 1 jour")
    @Max(value = 365, message = "Durée maximum 365 jours")
    private Integer duration;

    @Builder.Default
    @Pattern(regexp = "^(AUTOMATIC|MANUAL|ANY)$", message = "Transmission invalide")
    private String transmission = "ANY";

    @Builder.Default
    @Min(value = 1)
    @Max(value = 20)
    private Integer topK = 3;
}
