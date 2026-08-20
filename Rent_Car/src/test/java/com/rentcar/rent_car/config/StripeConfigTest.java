package com.rentcar.rent_car.config;

import com.stripe.Stripe;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Lazy;
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

    /**
     * Sous {@code spring.main.lazy-initialization=true}, un bean dont personne
     * ne depend n'est jamais instancie. Cette classe n'existant que pour
     * l'effet de bord de son {@code @PostConstruct}, elle doit rester eager :
     * sans quoi la cle Stripe n'est jamais appliquee et tout paiement echoue.
     */
    @Test
    void shouldStayEager_underLazyInitialization() {
        Lazy lazy = StripeConfig.class.getAnnotation(Lazy.class);

        assertThat(lazy).isNotNull();
        assertThat(lazy.value()).isFalse();
    }
}
