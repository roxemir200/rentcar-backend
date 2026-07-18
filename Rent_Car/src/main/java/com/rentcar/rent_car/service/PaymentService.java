package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.PaymentIntentResponse;
import com.rentcar.rent_car.dto.response.PaymentResponse;

import java.util.List;

public interface PaymentService {

    PaymentIntentResponse createPaymentIntent(Long reservationId);

    void handleWebhook(String payload, String signature);

    PaymentResponse getPaymentByReservation(Long reservationId);

    List<PaymentResponse> getAllPayments();

    MessageResponse refundPayment(Long paymentId);
}