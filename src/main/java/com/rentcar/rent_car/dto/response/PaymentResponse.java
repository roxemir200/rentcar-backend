package com.rentcar.rent_car.dto.response;

import com.rentcar.rent_car.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {

    private Long id;
    private String externalPaymentId;
    private BigDecimal amount;
    private String currency;
    private String provider;
    private PaymentStatus status;
    private LocalDateTime paymentDate;
    private Long reservationId;
    private String clientName;
    private String carInfo;
    private LocalDateTime createdAt;
}