package com.rentcar.rent_car.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
@Slf4j
public class StripeConfig {

    @Value("${stripe.secret.key:}")
    private String secretKey;

    /**
     * Applique la cle Stripe et signale son absence des le demarrage.
     * <p>
     * Sans ce controle, une cle vide ne se manifestait qu'au premier paiement,
     * sous la forme d'un « No API key provided » remonte depuis la
     * bibliotheque Stripe — au milieu d'une trace de plusieurs centaines de
     * lignes, et longtemps apres le deploiement fautif.
     * <p>
     * L'absence de cle n'empeche pas le demarrage : seul le paiement est
     * concerne, le reste de l'application reste utilisable.
     */
    @PostConstruct
    public void init() {
        if (!StringUtils.hasText(secretKey)) {
            log.error("STRIPE_SECRET_KEY est vide : toute création de paiement échouera. "
                    + "Renseignez la clé secrète (préfixe sk_test_ en mode test).");
            return;
        }

        Stripe.apiKey = secretKey;
        log.info("Stripe configuré en mode {}",
                secretKey.startsWith("sk_test_") ? "test" : "live");
    }
}
