package com.rentcar.rent_car.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Rend l'etat de la supervision lisible des le demarrage.
 *
 * <p>Une chaine de metriques mal configuree ne produit aucune erreur : le
 * demarrage reussit, l'application sert ses requetes, et rien n'arrive jamais
 * dans Grafana. On ne s'en apercoit qu'en cherchant pourquoi les graphiques
 * restent vides — et l'on soupconne alors tout, sauf une URL a laquelle il
 * manque un segment.
 *
 * <p>Cette classe n'exporte rien : elle constate et journalise. Trois lignes
 * au demarrage remplacent une enquete.
 *
 * <p>{@code @Lazy(false)} n'est pas decoratif, et la lecon a deja coute cher
 * ici : l'hebergeur active {@code spring.main.lazy-initialization=true}, et
 * aucun bean ne depend de cette classe. En initialisation paresseuse elle ne
 * serait jamais instanciee, et le journal qu'elle produit — precisement celui
 * qui doit signaler la panne — resterait muet. Voir {@link StripeConfig}.
 */
@Configuration
@Lazy(false)
@Slf4j
public class MonitoringConfig {

    @Value("${management.otlp.metrics.export.enabled:false}")
    private boolean otlpEnabled;

    @Value("${management.otlp.metrics.export.url:}")
    private String otlpUrl;

    @Value("${management.otlp.metrics.export.headers.Authorization:}")
    private String otlpAuthorization;

    @Value("${management.prometheus.metrics.export.enabled:false}")
    private boolean prometheusEnabled;

    @PostConstruct
    public void logState() {
        if (prometheusEnabled) {
            log.info("Metriques : endpoint /actuator/prometheus actif (scrutation locale).");
        }

        if (!otlpEnabled) {
            log.info("Metriques : export OTLP desactive. "
                    + "Pour l'activer, definir OTLP_ENABLED=true sur l'hebergeur.");
            return;
        }

        List<String> problemes = checkOtlp(otlpUrl, otlpAuthorization);
        if (problemes.isEmpty()) {
            // L'URL n'est pas un secret : elle designe une passerelle publique.
            // L'en-tete d'authentification, lui, n'est jamais journalise.
            log.info("Metriques : export OTLP actif vers {}", otlpUrl);
            return;
        }
        problemes.forEach(log::error);
    }

    /**
     * Controle la configuration OTLP et decrit ce qui cloche.
     * <p>
     * Extrait de {@link #logState()} pour etre verifiable sans demarrer Spring.
     *
     * @return la liste des anomalies, vide si la configuration est exploitable
     */
    static List<String> checkOtlp(String url, String authorization) {
        List<String> problemes = new ArrayList<>();

        if (!StringUtils.hasText(url)) {
            problemes.add("OTLP_ENABLED vaut true mais OTLP_METRICS_URL est vide : "
                    + "aucune metrique ne sera emise.");
        } else if (!url.endsWith("/v1/metrics")) {
            // Erreur la plus frequente : on releve l'adresse de la passerelle
            // et l'on oublie le chemin du signal. La passerelle recoit aussi
            // les traces et les journaux ; sans ce chemin, les metriques sont
            // rejetees, silencieusement.
            problemes.add("OTLP_METRICS_URL ne se termine pas par /v1/metrics : " + url
                    + " — attendu de la forme "
                    + "https://otlp-gateway-<zone>.grafana.net/otlp/v1/metrics");
        } else if (!url.contains("/otlp/")) {
            // Variante du meme oubli : le segment /otlp de la passerelle saute,
            // et l'URL parait pourtant complete puisqu'elle finit bien par
            // /v1/metrics.
            problemes.add("OTLP_METRICS_URL semble incomplete : " + url
                    + " — le segment /otlp de la passerelle manque probablement.");
        }

        if (!StringUtils.hasText(authorization)) {
            problemes.add("OTLP_AUTH_HEADER est vide : Grafana Cloud rejettera "
                    + "chaque envoi avec un 401, sans que l'application le signale.");
        }

        return problemes;
    }
}
