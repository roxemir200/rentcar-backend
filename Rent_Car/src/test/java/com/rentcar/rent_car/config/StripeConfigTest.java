package com.rentcar.rent_car.config;

import com.stripe.Stripe;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class StripeConfigTest {

    @Test
    void shouldInitStripeApiKey() {
        StripeConfig config = new StripeConfig();
        ReflectionTestUtils.setField(config, "secretKey", "sk_test_12345");

        config.init();

        assertThat(Stripe.apiKey).isEqualTo("sk_test_12345");
    }
}
