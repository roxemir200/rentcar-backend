package com.rentcar.rent_car.config;

import io.micrometer.core.instrument.composite.CompositeMeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.ConfigurationPropertySource;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;
import org.springframework.boot.micrometer.metrics.autoconfigure.MetricsProperties;
import org.springframework.boot.micrometer.metrics.autoconfigure.export.otlp.OtlpMetricsProperties;
import org.springframework.boot.micrometer.metrics.autoconfigure.export.prometheus.PrometheusProperties;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie que la configuration de supervision se relie reellement aux classes
 * de Spring Boot.
 * <p>
 * C'est la panne la plus vicieuse de cette phase : une propriete mal
 * orthographiee ne provoque aucune erreur. Spring ignore en silence ce qu'il
 * ne reconnait pas. La supervision parait configuree, le deploiement reussit,
 * et rien ne remonte — on ne s'en apercoit qu'en cherchant pourquoi les
 * graphiques restent vides, parfois des semaines plus tard.
 * <p>
 * Les valeurs testees sont celles qui figurent reellement dans les fichiers de
 * configuration : ce sont les cles qui sont verifiees, pas le framework.
 */
class MetricsConfigurationTest {

    private static Binder binderFor(Map<String, String> properties) {
        ConfigurationPropertySource source = new MapConfigurationPropertySource(properties);
        return new Binder(source);
    }

    /** Configuration de production : push OTLP vers Grafana Cloud. */
    @Test
    void shouldBindOtlpExportProperties() {
        Map<String, String> values = Map.of(
                "management.otlp.metrics.export.enabled", "true",
                "management.otlp.metrics.export.url", "https://exemple.invalid/otlp/v1/metrics",
                "management.otlp.metrics.export.headers.Authorization", "Basic jeton",
                "management.otlp.metrics.export.step", "60s");

        OtlpMetricsProperties bound = binderFor(values)
                .bind("management.otlp.metrics.export", OtlpMetricsProperties.class)
                .orElseThrow(() -> new AssertionError("Prefixe OTLP inconnu de Spring Boot"));

        assertThat(bound.isEnabled()).isTrue();
        assertThat(bound.getUrl()).isEqualTo("https://exemple.invalid/otlp/v1/metrics");
        assertThat(bound.getStep()).isEqualTo(Duration.ofSeconds(60));
        // L'en-tete d'authentification est le point le plus fragile : sans lui,
        // Grafana Cloud rejette chaque envoi avec un 401 que rien n'affiche
        // cote application.
        assertThat(bound.getHeaders()).containsEntry("Authorization", "Basic jeton");
    }

    /**
     * Unite de temps et delai de connexion : deux defauts qui ne conviennent
     * pas a ce montage.
     * <p>
     * Le registre OTLP publie les durees en MILLISECONDES, la ou le registre
     * Prometheus utilise les secondes : sans alignement, la meme mesure porte
     * deux noms selon le chemin, et un tableau de bord unique ne peut pas
     * servir les deux. Quant au delai de connexion, il vaut UNE seconde par
     * defaut -- insuffisant au demarrage a froid d'une instance mono-coeur.
     */
    @Test
    void shouldAlignTimeUnitAndRaiseConnectTimeout() {
        Map<String, String> values = Map.of(
                "management.otlp.metrics.export.base-time-unit", "seconds",
                "management.otlp.metrics.export.connect-timeout", "10s");

        OtlpMetricsProperties bound = binderFor(values)
                .bind("management.otlp.metrics.export", OtlpMetricsProperties.class)
                .orElseThrow(() -> new AssertionError("Prefixe OTLP inconnu de Spring Boot"));

        assertThat(bound.getBaseTimeUnit()).isEqualTo(TimeUnit.SECONDS);
        assertThat(bound.getConnectTimeout()).isEqualTo(Duration.ofSeconds(10));
    }

    /** Les valeurs doivent figurer dans le fichier du profil de production. */
    @Test
    void shouldConfigureTimeUnitAndTimeoutInProdProfile() throws IOException {
        Properties prod = loadClasspathProperties("application-prod.properties");

        assertThat(prod.getProperty("management.otlp.metrics.export.base-time-unit"))
                .isEqualTo("${OTLP_TIME_UNIT:seconds}");
        assertThat(prod.getProperty("management.otlp.metrics.export.connect-timeout"))
                .isEqualTo("${OTLP_CONNECT_TIMEOUT:10s}");
    }

    /** Configuration du docker-compose : exposition scrutee par Prometheus. */
    @Test
    void shouldBindPrometheusExportProperties() {
        PrometheusProperties bound = binderFor(
                Map.of("management.prometheus.metrics.export.enabled", "true"))
                .bind("management.prometheus.metrics.export", PrometheusProperties.class)
                .orElseThrow(() -> new AssertionError("Prefixe Prometheus inconnu de Spring Boot"));

        assertThat(bound.isEnabled()).isTrue();
    }

    /**
     * Etiquettes communes et histogrammes des temps de reponse.
     * <p>
     * Sans les etiquettes, deux environnements poussant vers la meme pile se
     * confondent dans un seul graphique. Sans les histogrammes, Micrometer ne
     * publie qu'une moyenne, qui masque precisement la minorite de requetes
     * lentes que l'on cherche.
     */
    @Test
    void shouldBindCommonTagsAndHistogram() {
        Map<String, String> values = Map.of(
                "management.metrics.tags.application", "rentcar-backend",
                "management.metrics.tags.env", "production",
                "management.metrics.distribution.percentiles-histogram.http.server.requests", "true");

        MetricsProperties bound = binderFor(values)
                .bind("management.metrics", MetricsProperties.class)
                .orElseThrow(() -> new AssertionError("Prefixe metrics inconnu de Spring Boot"));

        assertThat(bound.getTags())
                .containsEntry("application", "rentcar-backend")
                .containsEntry("env", "production");
        assertThat(bound.getDistribution().getPercentilesHistogram())
                .containsEntry("http.server.requests", true);
    }

    /**
     * Les exporteurs doivent rester neutralises par defaut.
     * <p>
     * Une application demarree sans configuration de supervision ne doit ni
     * ouvrir d'endpoint de metriques, ni tenter d'emettre vers un collecteur
     * absent — ce qui produirait une erreur a chaque intervalle d'envoi.
     */
    @Test
    void shouldDisableBothExportersByDefault() throws IOException {
        Properties common = loadClasspathProperties("application.properties");

        assertThat(common.getProperty("management.otlp.metrics.export.enabled"))
                .isEqualTo("${OTLP_ENABLED:false}");
        assertThat(common.getProperty("management.prometheus.metrics.export.enabled"))
                .isEqualTo("${PROMETHEUS_ENABLED:false}");
    }

    /**
     * L'exposition HTTP de l'actuator doit rester reduite a /actuator/health
     * quand aucune variable ne l'elargit.
     * <p>
     * Le docker-compose de supervision a besoin de /actuator/prometheus, et il
     * lance la MEME image avec le MEME profil que la production. Sans ce point
     * de variation, ouvrir l'endpoint pour la demonstration locale l'ouvrirait
     * aussi sur Internet.
     */
    @Test
    void shouldKeepActuatorClosedByDefault() throws IOException {
        Properties common = loadClasspathProperties("application.properties");

        assertThat(common.getProperty("management.endpoints.web.exposure.include"))
                .isEqualTo("${ACTUATOR_EXPOSURE:health}");
    }

    /**
     * L'URL reellement saisie sur l'hebergeur lors de la premiere tentative :
     * la passerelle sans son segment /otlp. Elle finit bien par /v1/metrics,
     * ce qui la fait paraitre complete — et Grafana Cloud rejette tout, sans
     * qu'aucune erreur ne remonte cote application.
     */
    @Test
    void shouldDetectGatewayUrlMissingItsOtlpSegment() {
        List<String> problemes = MonitoringConfig.checkOtlp(
                "https://otlp-gateway-prod-eu-west-2.grafana.net/v1/metrics", "Basic jeton");

        assertThat(problemes).hasSize(1);
        assertThat(problemes.get(0)).contains("/otlp");
    }

    @Test
    void shouldDetectUrlMissingTheSignalPath() {
        List<String> problemes = MonitoringConfig.checkOtlp(
                "https://otlp-gateway-prod-eu-west-2.grafana.net/otlp", "Basic jeton");

        assertThat(problemes).hasSize(1);
        assertThat(problemes.get(0)).contains("/v1/metrics");
    }

    @Test
    void shouldDetectMissingAuthorizationHeader() {
        List<String> problemes = MonitoringConfig.checkOtlp(
                "https://otlp-gateway-prod-eu-west-2.grafana.net/otlp/v1/metrics", "");

        assertThat(problemes).hasSize(1);
        assertThat(problemes.get(0)).contains("OTLP_AUTH_HEADER");
    }

    @Test
    void shouldAcceptAWellFormedConfiguration() {
        assertThat(MonitoringConfig.checkOtlp(
                "https://otlp-gateway-prod-eu-west-2.grafana.net/otlp/v1/metrics",
                "Basic jeton")).isEmpty();
    }

    /**
     * Compose un en-tete Basic contenant un jeton glc_ de la region donnee,
     * dans le format exact qu'emet Grafana Cloud.
     */
    private static String enTetePour(String region) {
        String charge = Base64.getEncoder().encodeToString(
                ("{\"o\":\"1\",\"n\":\"test\",\"k\":\"cle\",\"m\":{\"r\":\"" + region + "\"}}")
                        .getBytes(StandardCharsets.UTF_8));
        return "Basic " + Base64.getEncoder().encodeToString(
                ("123456:glc_" + charge).getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Le cas rencontre en production : jeton cree dans la region « us »,
     * passerelle europeenne. Grafana Cloud repond « invalid authentication
     * credentials » — le meme message que pour un jeton revoque, ce qui envoie
     * chercher du cote des permissions pendant des heures.
     */
    @Test
    void shouldDetectATokenFromTheWrongRegion() {
        List<String> problemes = MonitoringConfig.checkOtlp(
                "https://otlp-gateway-prod-eu-west-2.grafana.net/otlp/v1/metrics",
                enTetePour("us"));

        assertThat(problemes).hasSize(1);
        assertThat(problemes.get(0)).contains("region").contains("us").contains("prod-eu-west-2");
    }

    @Test
    void shouldAcceptATokenFromTheMatchingRegion() {
        assertThat(MonitoringConfig.checkOtlp(
                "https://otlp-gateway-prod-eu-west-2.grafana.net/otlp/v1/metrics",
                enTetePour("prod-eu-west-2"))).isEmpty();
    }

    /**
     * Grafana ecrit tantot « us », tantot « prod-us-east-0 » pour la meme
     * region. Une comparaison stricte alerterait a tort.
     */
    @Test
    void shouldTolerateTheAbbreviatedRegionForm() {
        assertThat(MonitoringConfig.checkOtlp(
                "https://otlp-gateway-prod-us-east-0.grafana.net/otlp/v1/metrics",
                enTetePour("us"))).isEmpty();
    }

    /** Un en-tete d'un autre format ne doit provoquer aucune alerte hative. */
    @Test
    void shouldStaySilentWhenTheTokenCannotBeRead() {
        assertThat(MonitoringConfig.checkOtlp(
                "https://otlp-gateway-prod-eu-west-2.grafana.net/otlp/v1/metrics",
                "Basic pas-du-base64-valide")).isEmpty();
    }

    /**
     * Spring Boot enveloppe les registres dans un composite des qu'il y en a
     * plusieurs. Nommer le bean racine dirait « Composite » et masquerait
     * justement ce qu'on cherche a savoir : OTLP est-il, oui ou non, en
     * service ?
     */
    @Test
    void shouldNameEachRegistryInsideAComposite() {
        CompositeMeterRegistry composite = new CompositeMeterRegistry();
        composite.add(new SimpleMeterRegistry());

        assertThat(MonitoringConfig.nomsDesRegistres(composite))
                .containsExactly("SimpleMeterRegistry");
    }

    @Test
    void shouldNameASingleRegistry() {
        assertThat(MonitoringConfig.nomsDesRegistres(new SimpleMeterRegistry()))
                .containsExactly("SimpleMeterRegistry");
    }

    /**
     * Le cas qui a coute le plus cher : sous initialisation paresseuse, aucun
     * registre n'existe. La configuration est pourtant parfaite, l'API repond
     * 200 aux tests manuels, et rien n'est jamais emis.
     */
    @Test
    void shouldReportNoRegistryAtAll() {
        assertThat(MonitoringConfig.nomsDesRegistres(null)).isEmpty();
    }

    private static Properties loadClasspathProperties(String name) throws IOException {
        Properties properties = new Properties();
        try (InputStream in = new ClassPathResource(name).getInputStream()) {
            properties.load(in);
        }
        return properties;
    }
}
