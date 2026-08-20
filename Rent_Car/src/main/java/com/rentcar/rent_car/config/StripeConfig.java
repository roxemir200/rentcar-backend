package com.rentcar.rent_car.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.util.StringUtils;

/**
 * Applique la cle Stripe au demarrage.
 *
 * <p>{@code @Lazy(false)} n'est pas decoratif. L'hebergeur active
 * {@code spring.main.lazy-initialization=true} pour accelerer les demarrages a
 * froid ; or aucun bean ne depend de cette classe, dont l'utilite tient
 * entierement a l'effet de bord de son {@code @PostConstruct}. En
 * initialisation paresseuse elle n'etait donc jamais instanciee :
 * {@code Stripe.apiKey} restait nul et chaque paiement echouait en
 * « No API key provided », alors meme que STRIPE_SECRET_KEY etait correctement
 * renseignee. Aucune trace au demarrage, puisque le journal de cette classe ne
 * s'ecrivait pas davantage.
 *
 * <p>L'annotation explicite exclut le bean du traitement paresseux : Spring
 * Boot ne touche qu'aux definitions dont le caractere paresseux n'a pas ete
 * fixe.
 */
@Configuration
@Lazy(false)
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
