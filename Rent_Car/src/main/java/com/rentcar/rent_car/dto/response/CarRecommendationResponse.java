package com.rentcar.rent_car.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CarRecommendationResponse {

    private Boolean success;
    private String error;
    private CarRecommendationRequestDTO preferences;
    private Meta meta;
    private List<CarRecommendationItem> data;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CarRecommendationRequestDTO {
        private String objective;
        private BigDecimal budget;
        private Integer passengers;
        private Integer duration;
        private String transmission;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Meta {
        private Integer carsScored;
        private Integer topK;
        private Boolean fallbackUsed;
        private String mlServiceStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CarRecommendationItem {
        private Long carId;
        private String brand;
        private String model;
        private BigDecimal dailyRate;
        private Double matchScore;
        private Double ratingAvg;
        private String categoryName;
        private List<String> highlights;
    }
}
