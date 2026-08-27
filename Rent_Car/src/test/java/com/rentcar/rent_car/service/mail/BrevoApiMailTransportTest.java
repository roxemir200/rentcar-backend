package com.rentcar.rent_car.service.mail;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class BrevoApiMailTransportTest {

    private static final String BASE_URL = "https://api.brevo.test";

    private MockRestServiceServer server;

    private BrevoApiMailTransport transportWith(String apiKey, String fromEmail) {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        return new BrevoApiMailTransport(builder, apiKey, BASE_URL, fromEmail, "RentCar");
    }

    @Test
    void shouldPostToBrevoEndpointWithApiKeyHeader() {
        BrevoApiMailTransport transport = transportWith("cle-secrete", "no-reply@rentcar.tn");

        server.expect(requestTo(BASE_URL + "/v3/smtp/email"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(header("api-key", "cle-secrete"))
                .andRespond(withSuccess("{\"messageId\":\"<abc@brevo>\"}", MediaType.APPLICATION_JSON));

        transport.send("client@test.com", "Vérifiez votre email", "Bonjour");

        server.verify();
    }

    @Test
    void shouldSendExpediteurRecipientSubjectAndBody() {
        BrevoApiMailTransport transport = transportWith("cle", "no-reply@rentcar.tn");

        server.expect(requestTo(BASE_URL + "/v3/smtp/email"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"email\":\"no-reply@rentcar.tn\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"email\":\"client@test.com\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"subject\":\"Objet\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"textContent\":\"Corps\"")))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        transport.send("client@test.com", "Objet", "Corps");

        server.verify();
    }

    /**
     * Brevo répond 400 lorsque l'adresse d'expédition n'est pas validée dans le
     * compte. Le message doit nommer cette cause : le code HTTP seul envoie
     * chercher dans la mauvaise direction.
     */
    @Test
    void shouldExplainThatSenderIsNotValidatedOnBadRequest() {
        BrevoApiMailTransport transport = transportWith("cle", "non-valide@rentcar.tn");

        server.expect(requestTo(BASE_URL + "/v3/smtp/email"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .body("{\"message\":\"Sender not valid\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> transport.send("client@test.com", "Objet", "Corps"))
                .isInstanceOf(MailDeliveryException.class)
                .hasMessageContaining("client@test.com")
                .hasMessageContaining("non-valide@rentcar.tn")
                .hasMessageContaining("Senders");
    }

    /**
     * Un 401 signale presque toujours la confusion entre la clé SMTP et la clé
     * API. Le message doit le dire, sous peine de faire chercher une panne
     * réseau là où il s'agit d'une variable mal renseignée.
     */
    @Test
    void shouldExplainApiKeyMixUpOnUnauthorized() {
        BrevoApiMailTransport transport = transportWith("mauvaise-cle", "no-reply@rentcar.tn");

        server.expect(requestTo(BASE_URL + "/v3/smtp/email"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> transport.send("client@test.com", "Objet", "Corps"))
                .isInstanceOf(MailDeliveryException.class)
                .hasMessageContaining("BREVO_API_KEY")
                .hasMessageContaining("xkeysib-")
                .hasMessageContaining("xsmtpsib-");
    }

    @Test
    void shouldRaiseWhenApiKeyIsMissingWithoutCallingBrevo() {
        BrevoApiMailTransport transport = transportWith("", "no-reply@rentcar.tn");

        assertThatThrownBy(() -> transport.send("client@test.com", "Objet", "Corps"))
                .isInstanceOf(MailDeliveryException.class)
                .hasMessageContaining("BREVO_API_KEY");

        server.verify(); // aucune requête ne doit avoir été émise
    }

    @Test
    void shouldRaiseWhenSenderAddressIsMissing() {
        BrevoApiMailTransport transport = transportWith("cle", "");

        assertThatThrownBy(() -> transport.send("client@test.com", "Objet", "Corps"))
                .isInstanceOf(MailDeliveryException.class)
                .hasMessageContaining("MAIL_FROM_EMAIL");
    }

    /**
     * Vérifie que <em>Spring</em> sait instancier ce composant.
     * <p>
     * Les tests ci-dessus construisent la classe à la main : ils ne disent rien
     * de la résolution des dépendances par le conteneur. Une première version
     * de ce transport attendait un bean {@code RestClient.Builder} qui n'existe
     * pas dans cette application — la panne n'est apparue qu'au démarrage en
     * production, après un déploiement complet.
     */
    @Test
    void shouldBeInstantiableBySpringWhenBrevoTransportIsSelected() {
        new ApplicationContextRunner()
                .withUserConfiguration(BrevoApiMailTransport.class)
                .withPropertyValues(
                        "app.mail.transport=brevo",
                        "app.mail.brevo.api-key=cle",
                        "app.mail.from.email=no-reply@rentcar.tn")
                .run(context -> assertThat(context)
                        .hasNotFailed()
                        .hasSingleBean(BrevoApiMailTransport.class));
    }

    /**
     * Toute autre réponse d'erreur reste exploitable : le code HTTP est repris
     * tel quel, faute de cause connue à nommer.
     */
    @Test
    void shouldReportTheStatusForAnyOtherFailure() {
        BrevoApiMailTransport transport = transportWith("cle", "no-reply@rentcar.tn");

        server.expect(requestTo(BASE_URL + "/v3/smtp/email"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> transport.send("client@test.com", "Objet", "Corps"))
                .isInstanceOf(MailDeliveryException.class)
                .hasMessageContaining("client@test.com")
                .hasMessageContaining("429");
    }

    /**
     * Brevo injoignable : panne réseau, DNS ou coupure sortante. L'échec doit
     * ressortir sous le même type que les refus applicatifs, sans quoi
     * l'appelant devrait connaître le transport pour l'attraper.
     */
    @Test
    void shouldTranslateNetworkFailuresIntoDeliveryException() {
        BrevoApiMailTransport transport = transportWith("cle", "no-reply@rentcar.tn");

        server.expect(requestTo(BASE_URL + "/v3/smtp/email"))
                .andRespond(withException(new java.io.IOException("connexion refusée")));

        assertThatThrownBy(() -> transport.send("client@test.com", "Objet", "Corps"))
                .isInstanceOf(MailDeliveryException.class)
                .hasMessageContaining("client@test.com");
    }

    /** Le transport Brevo ne doit pas être chargé lorsque le SMTP est retenu. */
    @Test
    void shouldNotBeLoadedWhenSmtpTransportIsSelected() {
        new ApplicationContextRunner()
                .withUserConfiguration(BrevoApiMailTransport.class)
                .withPropertyValues("app.mail.transport=smtp")
                .run(context -> assertThat(context)
                        .hasNotFailed()
                        .doesNotHaveBean(BrevoApiMailTransport.class));
    }
}
