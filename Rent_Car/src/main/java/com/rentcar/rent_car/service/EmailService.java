package com.rentcar.rent_car.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Async
    public void sendPasswordResetEmail(String to, String token) {
        // Update this URL to match your frontend URL (localhost:5173 for Vite)
        String resetLink = "http://localhost:5173/reset-password?token=" + token;

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
