package com.rentcar.rent_car.controller;

import tools.jackson.databind.ObjectMapper;
import com.rentcar.rent_car.dto.request.WebVitalRequest;
import com.rentcar.rent_car.service.imp.WebVitalsServiceImpl;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Ce point d'entree est public, en ecriture, et son appelant n'attend aucune
 * reponse : ces tests portent donc surtout sur sa robustesse face a ce qu'il
 * peut recevoir de moins soigne.
 */
class WebVitalsControllerTest {

    private MeterRegistry registre;
    private WebVitalsController controleur;

    @BeforeEach
    void setUp() {
        registre = new SimpleMeterRegistry();
        controleur = new WebVitalsController(new WebVitalsServiceImpl(registre), new ObjectMapper());
    }

    private double comptees() {
        return registre.find("rentcar.web.vitals").counters().stream()
                .mapToDouble(c -> c.count()).sum();
    }

    /**
     * Le navigateur envoie avec sendBeacon, qui impose un type de contenu
     * simple : le corps est du JSON transmis en text/plain. C'est le cas
     * nominal, et il doit fonctionner sans distinction.
     */
    @Test
    void shouldRecordMeasurementsSentAsPlainText() {
        String corps = "[{\"name\":\"LCP\",\"value\":2100,\"rating\":\"good\",\"path\":\"/cars\"},"
                + "{\"name\":\"CLS\",\"value\":0.05,\"rating\":\"good\",\"path\":\"/cars\"}]";

        ResponseEntity<Void> reponse = controleur.collect(corps);

        assertThat(reponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(comptees()).isEqualTo(2);
    }

    /**
     * Un corps illisible ne doit produire ni erreur ni trace bruyante : un
     * point d'entree public recoit aussi des robots.
     */
    @Test
    void shouldIgnoreAMalformedBodyWithoutFailing() {
        assertThat(controleur.collect("ceci n'est pas du json").getStatusCode())
                .isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(comptees()).isZero();
    }

    @Test
    void shouldIgnoreAnEmptyBody() {
        assertThat(controleur.collect(null).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(controleur.collect("   ").getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(comptees()).isZero();
    }

    /**
     * Une page emet trois mesures. Un lot de cinquante est forge, et sa seule
     * raison d'etre serait de gonfler les compteurs.
     */
    @Test
    void shouldRejectAnOversizedBatch() {
        StringBuilder corps = new StringBuilder("[");
        for (int i = 0; i < 50; i++) {
            corps.append(i > 0 ? "," : "")
                 .append("{\"name\":\"LCP\",\"value\":1000,\"rating\":\"good\",\"path\":\"/\"}");
        }
        corps.append("]");

        controleur.collect(corps.toString());

        assertThat(comptees()).isZero();
    }

    /** Un corps de plusieurs kilo-octets n'est meme pas analyse. */
    @Test
    void shouldNotEvenParseAnOversizedBody() {
        controleur.collect("[" + "x".repeat(9_000) + "]");

        assertThat(comptees()).isZero();
    }

    /**
     * Repond 204 meme lorsque tout est ecarte : l'appelant n'attend pas la
     * reponse, et lui detailler le filtrage ne servirait qu'a le contourner.
     */
    @Test
    void shouldAlwaysAnswerNoContent() {
        String rejete = "[{\"name\":\"INVENTE\",\"value\":1,\"rating\":\"good\",\"path\":\"/\"}]";

        assertThat(controleur.collect(rejete).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(comptees()).isZero();
    }

    /**
     * Verrou contre l'erreur qui a mis ce point d'entree hors service.
     * <p>
     * Deux Jackson coexistent dans le classpath : celui de Spring Boot 4
     * ({@code tools.jackson}, Jackson 3) et celui qu'amene JJWT
     * ({@code com.fasterxml}, Jackson 2). Seul le premier donne lieu a un bean.
     * Importer le second compile sans un mot, et echoue a la premiere requete
     * en production par un « No qualifying bean of type ObjectMapper ».
     * <p>
     * Un test qui instancie le controleur lui-meme ne peut pas detecter cela :
     * il fournit l'objet au lieu de le demander au conteneur. D'ou cette
     * verification sur le TYPE attendu par le constructeur.
     */
    @Test
    void shouldDependOnTheJacksonThatSpringActuallyProvides() {
        Class<?>[] parametres = WebVitalsController.class.getDeclaredConstructors()[0].getParameterTypes();

        assertThat(parametres)
                .as("le constructeur doit exiger l'ObjectMapper de Jackson 3")
                .contains(tools.jackson.databind.ObjectMapper.class);
        assertThat(parametres)
                .noneMatch(type -> type.getName().startsWith("com.fasterxml.jackson"));
    }

    /** Le DTO reste utilisable directement, sans passer par la deserialisation. */
    @Test
    void shouldExposeAUsableRequestObject() {
        WebVitalRequest mesure = new WebVitalRequest("LCP", 1500d, "good", "/cars");

        assertThat(mesure.getName()).isEqualTo("LCP");
        assertThat(mesure.getValue()).isEqualTo(1500d);
    }
}
