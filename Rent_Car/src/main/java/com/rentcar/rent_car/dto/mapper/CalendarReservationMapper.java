package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.response.CalendarReservationResponse;
import com.rentcar.rent_car.entity.Reservation;
import org.springframework.stereotype.Component;

@Component
public class CalendarReservationMapper {


    public CalendarReservationResponse mapToResponse(Reservation r) {
        return CalendarReservationResponse.builder()
                .id(r.getId())
                .carBrand(r.getCar() != null ? r.getCar().getBrand() : null)
                .carModel(r.getCar() != null ? r.getCar().getModel() : null)
                .clientFirstName(r.getClient() != null ? r.getClient().getFirstName() : null)
                .clientLastName(r.getClient() != null ? r.getClient().getLastName() : null)
                .startDate(r.getStartDate())
                .endDate(r.getEndDate())
                .status(r.getStatus() != null ? r.getStatus().name() : null)
                .carId(r.getCar() != null ? r.getCar().getId() : null)
                .clientId(r.getClient() != null ? r.getClient().getId() : null)
                .totalAmount(r.getTotalAmount() != null ? r.getTotalAmount().doubleValue() : null)
                .build();
    }
}
