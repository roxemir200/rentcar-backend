package com.rentcar.rent_car.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopCarResponse {

    private Long carId;
    private String brand;
    private String model;
    private String registrationNumber;
    private String imageUrl;
    private Long reservationCount;
    private BigDecimal totalRevenue;
    private Double averageRating;
}