package com.rentcar.rent_car.service.mail;

import org.junit.jupiter.api.Test;
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
     * compte. L'échec doit remonter explicitement, et non passer inaperçu.
     */
    @Test
    void shouldRaiseWhenBrevoRejectsTheRequest() {
        BrevoApiMailTransport transport = transportWith("cle", "non-valide@rentcar.tn");

        server.expect(requestTo(BASE_URL + "/v3/smtp/email"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .body("{\"message\":\"Sender not valid\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> transport.send("client@test.com", "Objet", "Corps"))
                .isInstanceOf(MailDeliveryException.class)
                .hasMessageContaining("client@test.com");
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

        assertThat(true).isTrue();
    }
}
