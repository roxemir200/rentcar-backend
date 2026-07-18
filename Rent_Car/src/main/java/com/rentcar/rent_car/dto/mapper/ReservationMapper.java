package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.ReservationRequest;
import com.rentcar.rent_car.dto.response.ReservationResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.temporal.ChronoUnit;

@Component
@RequiredArgsConstructor
public class ReservationMapper {

    private final CarRepository carRepository;
    private final UserRepository userRepository;

    public Reservation toEntity(ReservationRequest request, String clientEmail) {
        User client = userRepository.findByEmail(clientEmail)
                .orElseThrow(() -> new RuntimeException("Client non trouvé"));

        Car car = carRepository.findById(request.getCarId())
                .orElseThrow(() -> new RuntimeException("Voiture non trouvée"));

        Reservation reservation = new Reservation();
        reservation.setStartDate(request.getStartDate());
        reservation.setEndDate(request.getEndDate());
        reservation.setPickupLocation(request.getPickupLocation());
        reservation.setReturnLocation(request.getReturnLocation());
        reservation.setAdditionalNotes(request.getAdditionalNotes());
        reservation.setClient(client);
        reservation.setCar(car);
        reservation.setPricePerDaySnapshot(car.getDailyRate());

        long days = ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate());
        reservation.setTotalAmount(car.getDailyRate().multiply(BigDecimal.valueOf(days)));

        return reservation;
    }

    public ReservationResponse toResponse(Reservation reservation) {
        return ReservationResponse.builder()
                .id(reservation.getId())
                .startDate(reservation.getStartDate())
                .endDate(reservation.getEndDate())
                .pickupLocation(reservation.getPickupLocation())
                .returnLocation(reservation.getReturnLocation())
                .pricePerDaySnapshot(reservation.getPricePerDaySnapshot())
                .totalAmount(reservation.getTotalAmount())
                .status(reservation.getStatus())
                .carBrand(reservation.getCar().getBrand())
                .carModel(reservation.getCar().getModel())
                .carRegistrationNumber(reservation.getCar().getRegistrationNumber())
                .carId(reservation.getCar().getId())
                .clientFirstName(reservation.getClient().getFirstName())
                .clientLastName(reservation.getClient().getLastName())
                .clientEmail(reservation.getClient().getEmail())
                .clientId(reservation.getClient().getId())
                .additionalNotes(reservation.getAdditionalNotes())
                .mileageStart(reservation.getMileageStart())
                .mileageEnd(reservation.getMileageEnd())
                .fuelLevelStart(reservation.getFuelLevelStart())
                .fuelLevelEnd(reservation.getFuelLevelEnd())
                .damagesAtStart(reservation.getDamagesAtStart())
                .damagesAtEnd(reservation.getDamagesAtEnd())
                .createdAt(reservation.getCreatedAt())
                .build();
    }
}