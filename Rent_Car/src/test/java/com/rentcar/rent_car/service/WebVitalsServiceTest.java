package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.request.WebVitalRequest;
import com.rentcar.rent_car.service.imp.WebVitalsServiceImpl;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Le point d'entree qui alimente ce service est public et en ecriture : ces
 * tests portent donc autant sur ce qui est REFUSE que sur ce qui est retenu.
 */
class WebVitalsServiceTest {

    private MeterRegistry registre;
    private WebVitalsServiceImpl service;

    @BeforeEach
    void setUp() {
        registre = new SimpleMeterRegistry();
        service = new WebVitalsServiceImpl(registre);
    }

    private static WebVitalRequest mesure(String nom, double valeur, String verdict, String chemin) {
        return new WebVitalRequest(nom, valeur, verdict, chemin);
    }

    @Test
    void shouldRecordAValidMeasurement() {
        assertThat(service.record(mesure("LCP", 2100, "good", "/cars"))).isTrue();

        assertThat(registre.get("rentcar.web.vitals")
                .tag("metric", "lcp").tag("rating", "good").tag("route", "/cars")
                .counter().count()).isEqualTo(1);
    }

    /**
     * Le coeur du dispositif : « /reservation/42 » et « /reservation/43 » ne
     * doivent produire qu'UNE serie temporelle. Conserver le chemin brut en
     * creerait une par reservation, et saturerait le quota de la pile de
     * supervision en quelques jours.
     */
    @Test
    void shouldCollapseIdentifiersIntoASingleRoutePattern() {
        service.record(mesure("LCP", 1200, "good", "/reservation/42"));
        service.record(mesure("LCP", 1300, "good", "/reservation/43"));
        service.record(mesure("LCP", 1400, "good", "/reservation/9999"));

        assertThat(registre.get("rentcar.web.vitals")
                .tag("route", "/reservation/:id").counter().count()).isEqualTo(3);
    }

    /** Etiquette « route » effectivement portee par le compteur. */
    private String routeEnregistreePour(String chemin) {
        MeterRegistry isole = new SimpleMeterRegistry();
        new WebVitalsServiceImpl(isole).record(mesure("LCP", 1000, "good", chemin));
        return isole.get("rentcar.web.vitals").counter().getId().getTag("route");
    }

    /** Une route inconnue ne doit jamais creer d'etiquette nouvelle. */
    @Test
    void shouldMapUnknownPathsToASingleBucket() {
        assertThat(routeEnregistreePour("/chemin/invente/par/un/robot")).isEqualTo("autre");
        assertThat(routeEnregistreePour(null)).isEqualTo("autre");
        assertThat(routeEnregistreePour("/" + "x".repeat(200))).isEqualTo("autre");
    }

    /**
     * Une chaine de requete reintroduirait exactement la cardinalite que les
     * motifs de route servent a borner.
     */
    @Test
    void shouldIgnoreQueryStringAndFragment() {
        assertThat(routeEnregistreePour("/cars?tri=prix&page=3")).isEqualTo("/cars");
        assertThat(routeEnregistreePour("/cars#resultats")).isEqualTo("/cars");
    }

    @Test
    void shouldGroupAdministrationScreensTogether() {
        assertThat(routeEnregistreePour("/admin/dashboard")).isEqualTo("/admin/*");
        assertThat(routeEnregistreePour("/admin/cars")).isEqualTo("/admin/*");
    }

    @Test
    void shouldRejectAnUnknownMetricName() {
        assertThat(service.record(mesure("TTFB", 300, "good", "/cars"))).isFalse();
        assertThat(registre.find("rentcar.web.vitals").counter()).isNull();
    }

    @Test
    void shouldRejectAnUnknownRating() {
        assertThat(service.record(mesure("LCP", 2100, "excellent", "/cars"))).isFalse();
    }

    /**
     * Dix minutes d'affichage n'est pas une mesure : c'est un appel forge, ou
     * un onglet laisse ouvert des heures.
     */
    @Test
    void shouldRejectImplausibleValues() {
        assertThat(service.record(mesure("LCP", 999_999, "poor", "/cars"))).isFalse();
        assertThat(service.record(mesure("LCP", -5, "good", "/cars"))).isFalse();
        assertThat(service.record(mesure("LCP", Double.NaN, "good", "/cars"))).isFalse();
    }

    @Test
    void shouldAcceptTheMetricNameInAnyCase() {
        assertThat(service.record(mesure("cls", 0.05, "good", "/"))).isTrue();
        assertThat(registre.get("rentcar.web.vitals").tag("metric", "cls").counter().count()).isEqualTo(1);
    }

    @Test
    void shouldRejectNullInput() {
        assertThat(service.record(null)).isFalse();
        assertThat(service.record(mesure("LCP", 0, "good", "/"))).isTrue();
    }
}
