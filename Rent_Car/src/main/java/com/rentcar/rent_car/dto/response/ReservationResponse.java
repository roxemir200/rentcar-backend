package com.rentcar.rent_car.dto.response;

import com.rentcar.rent_car.enums.ReservationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationResponse {

    private Long id;
    private LocalDate startDate;
    private LocalDate endDate;
    private String pickupLocation;
    private String returnLocation;
    private BigDecimal pricePerDaySnapshot;
    private BigDecimal totalAmount;
    private ReservationStatus status;
    private String carBrand;
    private String carModel;
    private String carRegistrationNumber;
    private Long carId;
    private String clientFirstName;
    private String clientLastName;
    private String clientEmail;
    private Long clientId;
    private String additionalNotes;
    private Integer mileageStart;
    private Integer mileageEnd;
    private String fuelLevelStart;
    private String fuelLevelEnd;
    private String damagesAtStart;
    private String damagesAtEnd;
    private LocalDateTime createdAt;
}