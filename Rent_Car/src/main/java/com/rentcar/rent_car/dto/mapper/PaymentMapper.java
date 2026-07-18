package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.response.PaymentResponse;
import com.rentcar.rent_car.entity.Payment;
import org.springframework.stereotype.Component;

@Component
public class PaymentMapper {

    public PaymentResponse toResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .externalPaymentId(payment.getExternalPaymentId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .provider(payment.getProvider())
                .status(payment.getStatus())
                .paymentDate(payment.getPaymentDate())
                .reservationId(payment.getReservation() != null ? payment.getReservation().getId() : null)
                .clientName(payment.getReservation() != null && payment.getReservation().getClient() != null
                        ? payment.getReservation().getClient().getFirstName() + " "
                        + payment.getReservation().getClient().getLastName()
                        : null)
                .carInfo(payment.getReservation() != null && payment.getReservation().getCar() != null
                        ? payment.getReservation().getCar().getBrand() + " "
                        + payment.getReservation().getCar().getModel()
                        : null)
                .createdAt(payment.getCreatedAt())
                .build();
    }
}