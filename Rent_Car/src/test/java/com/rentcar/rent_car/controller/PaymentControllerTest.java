package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.CreatePaymentRequest;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.PaymentIntentResponse;
import com.rentcar.rent_car.dto.response.PaymentResponse;
import com.rentcar.rent_car.security.UserDetailsImpl;
import com.rentcar.rent_car.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock
    private PaymentService paymentService;

    @InjectMocks
    private PaymentController paymentController;

    private UserDetailsImpl userDetails;

    @BeforeEach
    void setUp() {
        userDetails = new UserDetailsImpl(1L, "client@test.com", "pass", null, true);
    }

    @Test
    void shouldCreatePaymentIntent() {
        PaymentIntentResponse intentResponse = new PaymentIntentResponse("secret", "pi_123", 1L);
        CreatePaymentRequest request = new CreatePaymentRequest(100L);

        when(paymentService.createPaymentIntent(100L)).thenReturn(intentResponse);

        ResponseEntity<PaymentIntentResponse> response = paymentController.createPaymentIntent(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getClientSecret()).isEqualTo("secret");
    }

    @Test
    void shouldGetPaymentByReservation() {
        when(paymentService.getPaymentByReservation(100L)).thenReturn(new PaymentResponse());

        ResponseEntity<PaymentResponse> response = paymentController.getPaymentByReservation(100L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldGetMyPayments() {
        when(paymentService.getPaymentsByCurrentUser("client@test.com")).thenReturn(List.of(new PaymentResponse()));

        ResponseEntity<List<PaymentResponse>> response = paymentController.getMyPayments(userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldGetAllPayments() {
        when(paymentService.getAllPayments()).thenReturn(List.of(new PaymentResponse()));

        ResponseEntity<List<PaymentResponse>> response = paymentController.getAllPayments();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldRefundPayment_whenSuccess() {
        when(paymentService.refundPayment(10L)).thenReturn(MessageResponse.success("Remboursé"));

        ResponseEntity<MessageResponse> response = paymentController.refundPayment(10L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().isSuccess()).isTrue();
    }

    @Test
    void shouldRefundPayment_whenError() {
        when(paymentService.refundPayment(10L)).thenReturn(MessageResponse.error("Erreur"));

        ResponseEntity<MessageResponse> response = paymentController.refundPayment(10L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().isSuccess()).isFalse();
    }
}
