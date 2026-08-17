package com.rentcar.rent_car.service.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Acheminement par SMTP classique.
 * <p>
 * Transport par défaut, adapté au poste de développement. En production,
 * lui préférer {@link BrevoApiMailTransport} : les hébergeurs filtrent
 * généralement les ports SMTP sortants.
 */
@Component
@ConditionalOnProperty(name = "app.mail.transport", havingValue = "smtp", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class SmtpMailTransport implements MailTransport {

    private final JavaMailSender mailSender;

    @Override
    public void send(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);

        try {
            mailSender.send(message);
            log.debug("Email SMTP envoyé à {}", to);
        } catch (MailException e) {
            throw new MailDeliveryException("Envoi SMTP impossible vers " + to, e);
        }
    }
}
