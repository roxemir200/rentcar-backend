package com.rentcar.rent_car.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Verifie le constat de demarrage produit par {@link MonitoringConfig}.
 * <p>
 * Cette classe n'exporte rien : sa seule production est un journal. C'est donc
 * le journal que l'on verifie ici — sans quoi la classe censee rendre une panne
 * visible pourrait elle-meme se taire sans que personne ne s'en apercoive.
 * <p>
 * {@link MetricsConfigurationTest} couvre l'analyse statique de l'URL et du
 * jeton ; on s'attache ici au chemin reellement emprunte au demarrage.
 */
class MonitoringConfigTest {

    private ListAppender<ILoggingEvent> journal;
    private Logger logger;

    /** Un registre dont le nom simple contient « Otlp », comme le vrai. */
    static class OtlpMeterRegistryDouble extends SimpleMeterRegistry {
    }

    @BeforeEach
    void brancherLeJournal() {
        logger = (Logger) LoggerFactory.getLogger(MonitoringConfig.class);
        journal = new ListAppender<>();
        journal.start();
        logger.addAppender(journal);
        logger.setLevel(Level.INFO);
    }

    @AfterEach
    void debrancherLeJournal() {
        logger.detachAppender(journal);
    }

    private List<String> messages(Level niveau) {
        return journal.list.stream()
                .filter(evenement -> evenement.getLevel() == niveau)
                .map(ILoggingEvent::getFormattedMessage)
                .toList();
    }

    /**
     * Construit la configuration comme Spring le ferait : injection du
     * fournisseur de registres, puis valorisation des {@code @Value}.
     */
    private MonitoringConfig configuration(MeterRegistry registre,
                                           boolean otlpActif,
                                           String url,
                                           String autorisation,
                                           boolean prometheusActif) {
        @SuppressWarnings("unchecked")
        ObjectProvider<MeterRegistry> fournisseur = mock(ObjectProvider.class);
        when(fournisseur.getIfAvailable()).thenReturn(registre);

        MonitoringConfig configuration = new MonitoringConfig(fournisseur);
        ReflectionTestUtils.setField(configuration, "otlpEnabled", otlpActif);
        ReflectionTestUtils.setField(configuration, "otlpUrl", url);
        ReflectionTestUtils.setField(configuration, "otlpAuthorization", autorisation);
        ReflectionTestUtils.setField(configuration, "prometheusEnabled", prometheusActif);
        return configuration;
    }

    /**
     * Configuration du docker-compose : Prometheus scrute l'application, aucun
     * envoi OTLP. Les deux faits doivent apparaitre, faute de quoi on cherche
     * un export qui n'a jamais ete demande.
     */
    @Test
    void shouldAnnouncePrometheusScrapingAndDisabledOtlp() {
        configuration(new SimpleMeterRegistry(), false, "", "", true).logState();

        assertThat(messages(Level.INFO))
                .anyMatch(message -> message.contains("/actuator/prometheus"))
                .anyMatch(message -> message.contains("SimpleMeterRegistry"))
                .anyMatch(message -> message.contains("OTLP desactive")
                        && message.contains("OTLP_ENABLED"));
        assertThat(messages(Level.ERROR)).isEmpty();
    }

    /** Sans exposition Prometheus, rien ne doit etre annonce a son sujet. */
    @Test
    void shouldStaySilentAboutPrometheusWhenTheEndpointIsClosed() {
        configuration(new SimpleMeterRegistry(), false, "", "", false).logState();

        assertThat(messages(Level.INFO))
                .noneMatch(message -> message.contains("/actuator/prometheus"));
    }

    /**
     * Le cas qui a coute le plus cher : sous initialisation paresseuse, aucun
     * registre n'est cree. Le journal doit le dire explicitement — c'est le
     * seul indice disponible, puisque l'application demarre normalement.
     */
    @Test
    void shouldReportWhenNoRegistryExistsAtAll() {
        configuration(null, false, "", "", false).logState();

        assertThat(messages(Level.INFO))
                .anyMatch(message -> message.contains("registres actifs = (aucun)"));
    }

    /** Configuration saine : l'URL visee est journalisee, sans erreur. */
    @Test
    void shouldConfirmTheActiveOtlpExport() {
        String url = "https://otlp-gateway-prod-eu-west-2.grafana.net/otlp/v1/metrics";

        configuration(new OtlpMeterRegistryDouble(), true, url, "Basic jeton", false).logState();

        assertThat(messages(Level.INFO))
                .anyMatch(message -> message.contains("export OTLP actif") && message.contains(url));
        assertThat(messages(Level.ERROR)).isEmpty();
    }

    /** L'en-tete d'authentification ne doit jamais atteindre le journal. */
    @Test
    void shouldNeverLogTheAuthorizationHeader() {
        configuration(new OtlpMeterRegistryDouble(), true,
                "https://otlp-gateway-prod-eu-west-2.grafana.net/otlp/v1/metrics",
                "Basic secret-a-ne-pas-divulguer", false).logState();

        assertThat(journal.list)
                .noneMatch(evenement ->
                        evenement.getFormattedMessage().contains("secret-a-ne-pas-divulguer"));
    }

    /**
     * Export demande, mais aucun registre OTLP en service : la configuration
     * parait correcte et rien n'est jamais emis. C'est exactement la panne que
     * cette classe existe pour rendre visible.
     */
    @Test
    void shouldRaiseAnErrorWhenTheOtlpRegistryIsMissing() {
        configuration(new SimpleMeterRegistry(), true,
                "https://otlp-gateway-prod-eu-west-2.grafana.net/otlp/v1/metrics",
                "Basic jeton", false).logState();

        assertThat(messages(Level.ERROR))
                .anyMatch(message -> message.contains("aucun registre OTLP")
                        && message.contains("micrometer-registry-otlp"));
    }

    /** Plusieurs anomalies doivent toutes etre signalees, et non la premiere. */
    @Test
    void shouldReportEveryProblemAtOnce() {
        configuration(new SimpleMeterRegistry(), true, "", "", false).logState();

        assertThat(messages(Level.ERROR)).hasSize(3)
                .anyMatch(message -> message.contains("OTLP_METRICS_URL est vide"))
                .anyMatch(message -> message.contains("OTLP_AUTH_HEADER est vide"))
                .anyMatch(message -> message.contains("aucun registre OTLP"));
    }

    /** URL absente : premiere anomalie possible, et la plus banale. */
    @Test
    void shouldDetectAnEmptyUrl() {
        List<String> problemes = MonitoringConfig.checkOtlp("", "Basic jeton");

        assertThat(problemes).hasSize(1);
        assertThat(problemes.get(0)).contains("OTLP_METRICS_URL est vide");
    }

    /**
     * Un en-tete Basic bien forme mais sans separateur « : » ne permet aucune
     * conclusion : on se tait plutot que d'alerter a tort.
     */
    @Test
    void shouldStaySilentWhenTheHeaderCarriesNoUserSeparator() {
        String enTete = "Basic " + Base64.getEncoder()
                .encodeToString("sans-deux-points".getBytes(StandardCharsets.UTF_8));

        assertThat(MonitoringConfig.checkOtlp(
                "https://otlp-gateway-prod-eu-west-2.grafana.net/otlp/v1/metrics", enTete))
                .isEmpty();
    }

    /** Un jeton qui n'est pas un {@code glc_} ne porte pas de region. */
    @Test
    void shouldStaySilentWhenTheTokenIsNotAGrafanaCloudToken() {
        String enTete = "Basic " + Base64.getEncoder()
                .encodeToString("123456:un-autre-jeton".getBytes(StandardCharsets.UTF_8));

        assertThat(MonitoringConfig.checkOtlp(
                "https://otlp-gateway-prod-eu-west-2.grafana.net/otlp/v1/metrics", enTete))
                .isEmpty();
    }

    /**
     * Passerelle hors du schema Grafana Cloud : la region n'est pas
     * determinable cote URL, la comparaison n'a donc pas lieu.
     */
    @Test
    void shouldStaySilentWhenTheGatewayRegionCannotBeRead() {
        String charge = Base64.getEncoder().encodeToString(
                "{\"m\":{\"r\":\"us\"}}".getBytes(StandardCharsets.UTF_8));
        String enTete = "Basic " + Base64.getEncoder()
                .encodeToString(("123456:glc_" + charge).getBytes(StandardCharsets.UTF_8));

        assertThat(MonitoringConfig.checkOtlp(
                "https://collecteur.interne.invalid/otlp/v1/metrics", enTete))
                .isEmpty();
    }
}
