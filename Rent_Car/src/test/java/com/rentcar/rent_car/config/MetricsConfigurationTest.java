package com.rentcar.rent_car.config;

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
import java.time.Duration;
import java.util.Map;
import java.util.Properties;

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

    private static Properties loadClasspathProperties(String name) throws IOException {
        Properties properties = new Properties();
        try (InputStream in = new ClassPathResource(name).getInputStream()) {
            properties.load(in);
        }
        return properties;
    }
}
