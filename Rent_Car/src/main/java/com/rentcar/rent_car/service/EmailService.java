package com.rentcar.rent_car.service;

import com.rentcar.rent_car.service.mail.MailTransport;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Rédaction des emails transactionnels.
 * <p>
 * Cette classe ne connaît que le contenu des messages. L'acheminement est
 * délégué à un {@link MailTransport}, choisi par configuration : SMTP en
 * développement, API HTTP Brevo en production, où les ports SMTP sortants
 * sont filtrés.
 */
@Service
@RequiredArgsConstructor
public class EmailService {

    private final MailTransport mailTransport;

    /**
     * Base des liens insérés dans les emails, pilotée par {@code app.frontend.url}.
     * <p>
     * Cette URL était figée sur localhost. En production, l'email partait sans
     * aucune erreur visible mais contenait un lien mort : l'utilisateur ne
     * pouvait jamais activer son compte ni réinitialiser son mot de passe.
     */
    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl = "http://localhost:5173";

    /** Retire la barre oblique finale pour éviter les doubles slashs dans les liens. */
    private String frontendBase() {
        return frontendUrl.endsWith("/")
                ? frontendUrl.substring(0, frontendUrl.length() - 1)
                : frontendUrl;
    }

    @Async
    public void sendPasswordResetEmail(String to, String token) {
        String resetLink = frontendBase() + "/reset-password?token=" + token;

        mailTransport.send(
                to,
                "Réinitialisation de votre mot de passe - RentCar",
                "Bonjour,\n\n"
                        + "Vous avez demandé la réinitialisation de votre mot de passe.\n"
                        + "Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :\n\n"
                        + resetLink + "\n\n"
                        + "Ce lien est valable 24 heures.\n\n"
                        + "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\n"
                        + "Cordialement,\n"
                        + "L'équipe RentCar");
    }

    @Async
    public void sendEmail(String to, String subject, String text) {
        mailTransport.send(to, subject, text);
    }
}
