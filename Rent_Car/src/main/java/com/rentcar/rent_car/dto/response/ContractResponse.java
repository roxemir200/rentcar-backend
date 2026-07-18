package com.rentcar.rent_car.dto.response;

import com.rentcar.rent_car.enums.ContractStatus;
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
public class ContractResponse {

    private Long id;
    private String contractNumber;
    private String terms;
    private String pdfUrl;
    private ContractStatus status;
    private LocalDateTime signedAt;
    private Long reservationId;
    private String clientFirstName;
    private String clientLastName;
    private String clientEmail;
    private String carBrand;
    private String carModel;
    private String carRegistration;
    private String carColor;
    private Integer carMileage;
    private String carFuelType;
    private String carTransmission;
    private Integer carSeats;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long durationDays;
    private String pickupLocation;
    private String returnLocation;
    private BigDecimal dailyRate;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;
}