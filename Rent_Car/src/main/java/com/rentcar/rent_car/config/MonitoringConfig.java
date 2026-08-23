package com.rentcar.rent_car.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.composite.CompositeMeterRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.ObjectProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.util.StringUtils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Reconnait « otlp-gateway-prod-eu-west-2.grafana.net » et sa region. */
    private static final Pattern PASSERELLE =
            Pattern.compile("otlp-gateway-([a-z0-9-]+)[.]grafana[.]net");

    @Value("${management.otlp.metrics.export.enabled:false}")
    private boolean otlpEnabled;

    @Value("${management.otlp.metrics.export.url:}")
    private String otlpUrl;

    @Value("${management.otlp.metrics.export.headers.Authorization:}")
    private String otlpAuthorization;

    @Value("${management.prometheus.metrics.export.enabled:false}")
    private boolean prometheusEnabled;

    /**
     * Force la creation du registre de metriques au demarrage.
     *
     * <p>C'est la raison d'etre de cette dependance, et elle n'est pas
     * decorative. Sous {@code spring.main.lazy-initialization=true}, Spring ne
     * cree un bean que si quelqu'un le reclame. Or {@code OtlpMeterRegistry}
     * est un registre <em>push</em> : il demarre son ordonnanceur d'envoi a sa
     * creation. Sans personne pour le demander, il n'existe pas, ne demarre
     * pas, et n'emet jamais rien — alors que toute la configuration est
     * correcte et qu'aucune erreur n'apparait nulle part.
     *
     * <p>Cette classe etant eager, resoudre le registre ici le fait exister
     * des le demarrage, et l'export commence reellement.
     *
     * <p>{@code ObjectProvider} plutot qu'une injection directe : la
     * resolution a lieu dans {@code @PostConstruct} et non a la construction,
     * ce qui evite d'imposer un ordre entre cette classe et les
     * auto-configurations de Micrometer.
     */
    private final ObjectProvider<MeterRegistry> registres;

    public MonitoringConfig(ObjectProvider<MeterRegistry> registres) {
        this.registres = registres;
    }

    @PostConstruct
    public void logState() {
        if (prometheusEnabled) {
            log.info("Metriques : endpoint /actuator/prometheus actif (scrutation locale).");
        }

        // Resolution volontaire : c'est elle qui instancie et demarre les
        // registres. Le journal qui suit n'est qu'un effet de bord utile.
        List<String> actifs = nomsDesRegistres(registres.getIfAvailable());
        log.info("Metriques : registres actifs = {}",
                actifs.isEmpty() ? "(aucun)" : String.join(", ", actifs));

        if (!otlpEnabled) {
            log.info("Metriques : export OTLP desactive. "
                    + "Pour l'activer, definir OTLP_ENABLED=true sur l'hebergeur.");
            return;
        }

        List<String> problemes = checkOtlp(otlpUrl, otlpAuthorization);
        if (actifs.stream().noneMatch(nom -> nom.contains("Otlp"))) {
            problemes.add("Export OTLP demande, mais aucun registre OTLP n'est actif. "
                    + "Verifier que micrometer-registry-otlp est bien dans le classpath.");
        }

        if (problemes.isEmpty()) {
            // L'URL n'est pas un secret : elle designe une passerelle publique.
            // L'en-tete d'authentification, lui, n'est jamais journalise.
            log.info("Metriques : export OTLP actif vers {}", otlpUrl);
            return;
        }
        problemes.forEach(log::error);
    }

    /**
     * Nomme les registres reellement en service.
     * <p>
     * Spring Boot enveloppe les registres dans un composite des qu'il y en a
     * plus d'un : afficher le seul type du bean racine dirait « Composite » et
     * n'apprendrait rien.
     */
    static List<String> nomsDesRegistres(MeterRegistry registre) {
        if (registre == null) {
            return List.of();
        }
        if (registre instanceof CompositeMeterRegistry composite) {
            return composite.getRegistries().stream()
                    .map(membre -> membre.getClass().getSimpleName())
                    .sorted()
                    .toList();
        }
        return List.of(registre.getClass().getSimpleName());
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
        } else {
            checkRegion(url, authorization).ifPresent(problemes::add);
        }

        return problemes;
    }

    /**
     * Compare la region du jeton a celle de la passerelle visee.
     * <p>
     * Une politique d'acces Grafana Cloud n'existe que dans sa region. Un jeton
     * cree cote « us » et presente a la passerelle « prod-eu-west-2 » est
     * inconnu de celle-ci : elle repond « invalid authentication credentials »,
     * exactement comme pour un jeton revoque. Rien, ni dans l'interface ni dans
     * le jeton affiche, ne rend cet ecart visible — et l'on cherche longtemps
     * du cote des permissions.
     * <p>
     * L'information est pourtant disponible : un jeton {@code glc_} porte sa
     * region dans sa charge utile.
     *
     * @return le probleme constate, ou rien si la comparaison est impossible
     */
    private static Optional<String> checkRegion(String url, String authorization) {
        String regionJeton = regionDuJeton(authorization);
        String regionPasserelle = regionDeLUrl(url);

        if (regionJeton == null || regionPasserelle == null) {
            return Optional.empty();
        }
        // Les deux ecritures coexistent : « us » et « prod-us-east-0 » designent
        // la meme region. On ne signale que les valeurs franchement etrangeres
        // l'une a l'autre, pour ne pas alerter a tort sur une forme abregee.
        if (regionPasserelle.contains(regionJeton) || regionJeton.contains(regionPasserelle)) {
            return Optional.empty();
        }
        return Optional.of("Le jeton OTLP appartient a la region '" + regionJeton
                + "' alors que la passerelle visee est '" + regionPasserelle + "'. "
                + "Grafana Cloud rejettera chaque envoi. Recreer la politique "
                + "d'acces dans la region de la pile.");
    }

    /** Extrait la region encodee dans un jeton {@code glc_}, ou {@code null}. */
    private static String regionDuJeton(String authorization) {
        try {
            String encode = authorization.startsWith("Basic ")
                    ? authorization.substring("Basic ".length()).trim()
                    : authorization.trim();
            String paire = new String(Base64.getDecoder().decode(encode), StandardCharsets.UTF_8);

            int separateur = paire.indexOf(':');
            if (separateur < 0) {
                return null;
            }
            String jeton = paire.substring(separateur + 1);
            if (!jeton.startsWith("glc_")) {
                return null;
            }
            String utile = jeton.substring("glc_".length());
            String complement = "=".repeat((4 - utile.length() % 4) % 4);

            JsonNode racine = MAPPER.readTree(Base64.getDecoder().decode(utile + complement));
            JsonNode region = racine.path("m").path("r");
            return region.isTextual() ? region.asText() : null;
        } catch (RuntimeException | java.io.IOException e) {
            // Jeton d'un autre format : on ne conclut rien plutot que d'alerter
            // a tort. Le controle est une aide, pas une regle.
            return null;
        }
    }

    /** Extrait la region du nom d'hote de la passerelle, ou {@code null}. */
    private static String regionDeLUrl(String url) {
        Matcher matcher = PASSERELLE.matcher(url);
        return matcher.find() ? matcher.group(1) : null;
    }
}
