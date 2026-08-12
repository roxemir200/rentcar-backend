package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class WebhookControllerTest {

    @Mock
    private PaymentService paymentService;

    @InjectMocks
    private WebhookController webhookController;

    @Test
    void shouldHandleStripeWebhook() {
        String payload = "{\"id\": \"evt_123\"}";
        String signature = "sig_123";

        ResponseEntity<String> response = webhookController.handleStripeWebhook(payload, signature);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo("OK");
        verify(paymentService).handleWebhook(payload, signature);
    }
}
