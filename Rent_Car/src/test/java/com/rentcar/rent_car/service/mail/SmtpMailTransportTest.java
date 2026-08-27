package com.rentcar.rent_car.service.mail;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

/**
 * Transport par defaut, utilise sur le poste de developpement.
 * <p>
 * Le point verifie ici est la traduction de l'echec : le reste de
 * l'application ne connait que {@link MailDeliveryException}, et ne doit pas
 * dependre du transport retenu. Sans cette traduction, remplacer SMTP par
 * l'API Brevo changerait le type d'exception vu par les appelants.
 */
@ExtendWith(MockitoExtension.class)
class SmtpMailTransportTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private SmtpMailTransport transport;

    @Test
    void shouldSendRecipientSubjectAndBody() {
        transport.send("client@test.com", "Verifiez votre email", "Bonjour");

        ArgumentCaptor<SimpleMailMessage> envoi = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(envoi.capture());

        SimpleMailMessage message = envoi.getValue();
        assertThat(message.getTo()).containsExactly("client@test.com");
        assertThat(message.getSubject()).isEqualTo("Verifiez votre email");
        assertThat(message.getText()).isEqualTo("Bonjour");
    }

    /**
     * Un echec SMTP doit ressortir sous le type commun aux transports, en
     * nommant le destinataire concerne : c'est la seule information qui permet
     * de retrouver l'envoi perdu dans les journaux.
     */
    @Test
    void shouldTranslateMailExceptionIntoDeliveryException() {
        doThrow(new MailSendException("port 587 bloque"))
                .when(mailSender).send(org.mockito.ArgumentMatchers.any(SimpleMailMessage.class));

        assertThatThrownBy(() -> transport.send("client@test.com", "Objet", "Corps"))
                .isInstanceOf(MailDeliveryException.class)
                .hasMessageContaining("client@test.com")
                .hasCauseInstanceOf(MailSendException.class);
    }
}
