package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.response.ContractResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Contract;
import com.rentcar.rent_car.entity.Reservation;
import org.springframework.stereotype.Component;

import java.time.temporal.ChronoUnit;

@Component
public class ContractMapper {

    public ContractResponse toResponse(Contract contract) {
        Reservation r = contract.getReservation();
        Car car = r != null ? r.getCar() : null;

        return ContractResponse.builder()
                .id(contract.getId())
                .contractNumber(contract.getContractNumber())
                .terms(contract.getTerms())
                .pdfUrl(contract.getPdfUrl())
                .status(contract.getStatus())
                .signedAt(contract.getSignedAt())
                .reservationId(r != null ? r.getId() : null)
                .clientFirstName(r != null && r.getClient() != null ? r.getClient().getFirstName() : null)
                .clientLastName(r != null && r.getClient() != null ? r.getClient().getLastName() : null)
                .clientEmail(r != null && r.getClient() != null ? r.getClient().getEmail() : null)
                .carBrand(car != null ? car.getBrand() : null)
                .carModel(car != null ? car.getModel() : null)
                .carRegistration(car != null ? car.getRegistrationNumber() : null)
                .carColor(car != null ? car.getColor() : null)
                .carMileage(car != null ? car.getMileage() : null)
                .carFuelType(car != null && car.getFuelType() != null ? car.getFuelType().name() : null)
                .carTransmission(car != null && car.getTransmission() != null ? car.getTransmission().name() : null)
                .carSeats(car != null ? car.getSeats() : null)
                .startDate(r != null ? r.getStartDate() : null)
                .endDate(r != null ? r.getEndDate() : null)
                .durationDays(r != null && r.getStartDate() != null && r.getEndDate() != null ? ChronoUnit.DAYS.between(r.getStartDate(), r.getEndDate()) : null)
                .pickupLocation(r != null ? r.getPickupLocation() : null)
                .returnLocation(r != null ? r.getReturnLocation() : null)
                .dailyRate(r != null ? r.getPricePerDaySnapshot() : null)
                .totalAmount(r != null ? r.getTotalAmount() : null)
                .createdAt(contract.getCreatedAt())
                .build();
    }
}