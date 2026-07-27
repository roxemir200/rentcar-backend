// dto/response/CalendarReservationResponse.java
package com.rentcar.rent_car.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarReservationResponse {
    private Long id;
    private String carBrand;
    private String carModel;
    private String clientFirstName;
    private String clientLastName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private Long carId;
    private Long clientId;
    private Double totalAmount;
}