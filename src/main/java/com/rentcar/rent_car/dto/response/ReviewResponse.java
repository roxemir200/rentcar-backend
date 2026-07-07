package com.rentcar.rent_car.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {

    private Long id;
    private Integer rating;
    private String comment;
    private String clientFirstName;
    private String clientLastName;
    private Long clientId;
    private String carBrand;
    private String carModel;
    private Long carId;
    private Long reservationId;
    private LocalDateTime createdAt;
}