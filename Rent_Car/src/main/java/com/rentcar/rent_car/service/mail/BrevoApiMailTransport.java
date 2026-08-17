package com.rentcar.rent_car.service.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
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

    /** Délai d'établissement de la connexion vers l'API Brevo. */
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);

    /** Délai de lecture de la réponse. */
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    /**
     * Constructeur utilisé par Spring.
     * <p>
     * Le client est construit ici avec la fabrique statique, et non injecté :
     * {@code RestClient.Builder} n'est pas fourni comme bean dans cette
     * application. C'est aussi le motif déjà retenu par
     * {@code MlServiceConfig}, ce qui permet de fixer explicitement les délais
     * d'expiration — sans eux, un envoi lent immobiliserait un thread.
     */
    @Autowired
    public BrevoApiMailTransport(
            @Value("${app.mail.brevo.api-key:}") String apiKey,
            @Value("${app.mail.brevo.base-url:" + DEFAULT_BASE_URL + "}") String baseUrl,
            @Value("${app.mail.from.email:}") String fromEmail,
            @Value("${app.mail.from.name:RentCar}") String fromName) {

        this(defaultBuilder(), apiKey, baseUrl, fromEmail, fromName);
    }

    /** Construit le client HTTP avec des délais d'expiration bornés. */
    private static RestClient.Builder defaultBuilder() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT);
        factory.setReadTimeout(READ_TIMEOUT);
        return RestClient.builder().requestFactory(factory);
    }

    /** Variante permettant aux tests de fournir un client simulé. */
    BrevoApiMailTransport(
            RestClient.Builder restClientBuilder,
            String apiKey,
            String baseUrl,
            String fromEmail,
            String fromName) {

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
        } catch (HttpClientErrorException e) {
            // Brevo distingue deux echecs de configuration tres differents,
            // que le code HTTP seul ne rend pas evidents. Les nommer ici evite
            // de chercher dans la mauvaise direction.
            String diagnostic = switch (e.getStatusCode().value()) {
                case 401 -> "clé API refusée. Vérifiez BREVO_API_KEY : il faut la clé "
                        + "API (onglet « API Keys », préfixe xkeysib-), et non la clé SMTP "
                        + "(préfixe xsmtpsib-), qui n'authentifie pas cette API.";
                case 400 -> "requête refusée. Cause la plus fréquente : l'adresse "
                        + "d'expédition « " + fromEmail + " » n'est pas validée dans Brevo "
                        + "(section « Senders »).";
                default -> "réponse " + e.getStatusCode() + " de l'API.";
            };
            throw new MailDeliveryException(
                    "Envoi Brevo impossible vers " + to + " — " + diagnostic, e);
        } catch (RestClientException e) {
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
