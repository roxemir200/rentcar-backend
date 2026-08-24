package com.rentcar.rent_car.config;

import io.micrometer.registry.otlp.OtlpMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.micrometer.metrics.autoconfigure.CompositeMeterRegistryAutoConfiguration;
import org.springframework.boot.micrometer.metrics.autoconfigure.MetricsAutoConfiguration;
import org.springframework.boot.micrometer.metrics.autoconfigure.export.otlp.OtlpMetricsExportAutoConfiguration;
import org.springframework.boot.micrometer.metrics.autoconfigure.export.simple.SimpleMetricsExportAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie que le registre OTLP est reellement CREE, et pas seulement configure.
 * <p>
 * La distinction est tout sauf theorique : pendant plusieurs deploiements,
 * l'application affichait une configuration OTLP valide, l'authentification
 * repondait 200 aux tests manuels, et aucune metrique n'arrivait. Le bean
 * n'existait pas, faute d'une classe exigee par
 * {@code @ConditionalOnClass} — une condition qui echoue sans rien journaliser.
 * <p>
 * Ce test echouerait si la dependance {@code spring-boot-opentelemetry}
 * disparaissait du pom : c'est precisement le regressif qui manquait.
 */
class OtlpRegistryContextTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(
                    MetricsAutoConfiguration.class,
                    CompositeMeterRegistryAutoConfiguration.class,
                    SimpleMetricsExportAutoConfiguration.class,
                    OtlpMetricsExportAutoConfiguration.class));

    @Test
    void shouldCreateTheOtlpRegistry_whenExportIsEnabled() {
        runner.withPropertyValues(
                        "management.otlp.metrics.export.enabled=true",
                        "management.otlp.metrics.export.url=https://exemple.invalid/otlp/v1/metrics",
                        "management.otlp.metrics.export.headers.Authorization=Basic jeton")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(OtlpMeterRegistry.class);
                });
    }

    /**
     * Le symptome exact observe en production : sans registre OTLP, Spring Boot
     * fournit SimpleMeterRegistry, qui n'emet nulle part. Un registre est bien
     * la, l'application semble instrumentee, et rien ne part.
     */
    @Test
    void shouldFallBackToSimpleRegistry_whenExportIsDisabled() {
        runner.withPropertyValues("management.otlp.metrics.export.enabled=false")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).doesNotHaveBean(OtlpMeterRegistry.class);
                    assertThat(MonitoringConfig.nomsDesRegistres(
                            context.getBean(io.micrometer.core.instrument.MeterRegistry.class)))
                            .containsExactly("SimpleMeterRegistry");
                });
    }
}
