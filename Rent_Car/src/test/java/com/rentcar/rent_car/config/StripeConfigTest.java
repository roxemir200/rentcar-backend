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
     * Cle absente : le demarrage se poursuit, seul le paiement est concerne.
     * <p>
     * Refuser de demarrer rendrait indisponible tout le reste de l'application
     * — catalogue, reservations, contrats — pour une variable d'environnement
     * oubliee. La cle en place ne doit pas non plus etre ecrasee par du vide.
     */
    @Test
    void shouldNotApplyAnEmptyKeyNorPreventStartup() {
        Stripe.apiKey = "sk_test_deja_en_place";
        StripeConfig config = new StripeConfig();
        ReflectionTestUtils.setField(config, "secretKey", "");

        config.init();

        assertThat(Stripe.apiKey).isEqualTo("sk_test_deja_en_place");
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
