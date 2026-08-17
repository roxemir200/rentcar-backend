package com.rentcar.rent_car.service.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;

/**
 * Acheminement par l'API HTTP transactionnelle de Brevo.
 * <p>
 * L'appel passe en HTTPS sur le port 443, qui n'est jamais filtré — à la
 * différence des ports SMTP, que la plupart des hébergeurs bloquent en
 * sortie. C'est la raison d'être de ce transport.
 * <p>
 * L'adresse d'expédition doit être <strong>validée</strong> dans Brevo
 * (section <em>Senders</em>), sinon l'API répond 400 quelle que soit la
 * validité de la clé.
 */
@Component
@ConditionalOnProperty(name = "app.mail.transport", havingValue = "brevo")
@Slf4j
public class BrevoApiMailTransport implements MailTransport {

    private static final String DEFAULT_BASE_URL = "https://api.brevo.com";
    private static final String SEND_PATH = "/v3/smtp/email";

    private final RestClient restClient;
    private final String apiKey;
    private final String fromEmail;
    private final String fromName;

    public BrevoApiMailTransport(
            RestClient.Builder restClientBuilder,
            @Value("${app.mail.brevo.api-key:}") String apiKey,
            @Value("${app.mail.brevo.base-url:" + DEFAULT_BASE_URL + "}") String baseUrl,
            @Value("${app.mail.from.email:}") String fromEmail,
            @Value("${app.mail.from.name:RentCar}") String fromName) {

        this.apiKey = apiKey;
        this.fromEmail = fromEmail;
        this.fromName = fromName;
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();

        // Diagnostic au demarrage plutot qu'a la premiere inscription : une
        // configuration incomplete se decouvre autrement le jour ou un
        // utilisateur s'inscrit et n'obtient jamais son email.
        if (!StringUtils.hasText(apiKey)) {
            log.error("Transport Brevo actif mais BREVO_API_KEY est vide : aucun email ne partira.");
        }
        if (!StringUtils.hasText(fromEmail)) {
            log.error("Transport Brevo actif mais MAIL_FROM_EMAIL est vide : aucun email ne partira.");
        }
    }

    @Override
    public void send(String to, String subject, String text) {
        if (!StringUtils.hasText(apiKey) || !StringUtils.hasText(fromEmail)) {
            throw new MailDeliveryException(
                    "Transport Brevo mal configuré : renseignez BREVO_API_KEY et MAIL_FROM_EMAIL.");
        }

        BrevoEmail payload = new BrevoEmail(
                new Sender(fromName, fromEmail),
                List.of(new Recipient(to)),
                subject,
                text);

        try {
            restClient.post()
                    .uri(SEND_PATH)
                    .header("api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            log.info("Email envoyé à {} via l'API Brevo", to);
        } catch (RestClientException e) {
            // Le message d'erreur de Brevo est precieux : il distingue une cle
            // invalide d'une adresse d'expediteur non validee.
            throw new MailDeliveryException("Envoi Brevo impossible vers " + to, e);
        }
    }

    /** Expéditeur, tel qu'attendu par l'API Brevo. */
    record Sender(String name, String email) {
    }

    /** Destinataire, tel qu'attendu par l'API Brevo. */
    record Recipient(String email) {
    }

    /** Corps de la requête {@code POST /v3/smtp/email}. */
    record BrevoEmail(Sender sender, List<Recipient> to, String subject, String textContent) {
    }
}
