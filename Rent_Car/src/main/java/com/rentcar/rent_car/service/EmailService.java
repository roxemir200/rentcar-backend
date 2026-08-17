package com.rentcar.rent_car.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    /**
     * Base des liens inseres dans les emails, pilotee par {@code app.frontend.url}.
     * <p>
     * Cette URL etait figee sur localhost. En production, l'email partait sans
     * aucune erreur visible mais contenait un lien mort : l'utilisateur ne
     * pouvait jamais activer son compte ni reinitialiser son mot de passe.
     */
    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl = "http://localhost:5173";

    /** Retire la barre oblique finale pour eviter les doubles slashs dans les liens. */
    private String frontendBase() {
        return frontendUrl.endsWith("/")
                ? frontendUrl.substring(0, frontendUrl.length() - 1)
                : frontendUrl;
    }

    @Async
    public void sendPasswordResetEmail(String to, String token) {
        String resetLink = frontendBase() + "/reset-password?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Réinitialisation de votre mot de passe - RentCar");
        message.setText(
                "Bonjour,\n\n"
                        + "Vous avez demandé la réinitialisation de votre mot de passe.\n"
                        + "Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :\n\n"
                        + resetLink + "\n\n"
                        + "Ce lien est valable 24 heures.\n\n"
                        + "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\n"
                        + "Cordialement,\n"
                        + "L'équipe RentCar"
        );
        mailSender.send(message);
    }

    @Async
    public void sendEmail(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }
}
