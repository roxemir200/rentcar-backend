package com.rentcar.rent_car.service;

import com.rentcar.rent_car.service.mail.MailTransport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private MailTransport mailTransport;

    @InjectMocks
    private EmailService emailService;

    @Test
    void shouldSendPasswordResetEmail() {
        emailService.sendPasswordResetEmail("user@test.com", "reset-token-123");

        ArgumentCaptor<String> to = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> subject = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailTransport).send(to.capture(), subject.capture(), body.capture());

        assertThat(to.getValue()).isEqualTo("user@test.com");
        assertThat(subject.getValue()).contains("Réinitialisation");
        assertThat(body.getValue()).contains("reset-token-123");
    }

    @Test
    void shouldSendGenericEmail() {
        emailService.sendEmail("to@test.com", "Subject Test", "Hello Body");

        verify(mailTransport).send("to@test.com", "Subject Test", "Hello Body");
    }

    /**
     * Le lien envoyé doit pointer vers l'URL publique du frontend, et non vers
     * localhost : c'est précisément le défaut qui rendait la vérification de
     * compte impossible une fois l'application déployée.
     */
    @Test
    void shouldBuildResetLinkFromConfiguredFrontendUrl() {
        ReflectionTestUtils.setField(emailService, "frontendUrl", "https://rentcar.vercel.app");

        emailService.sendPasswordResetEmail("user@test.com", "tok");

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailTransport).send(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(), body.capture());

        assertThat(body.getValue())
                .contains("https://rentcar.vercel.app/reset-password?token=tok")
                .doesNotContain("localhost");
    }

    /** Une barre oblique finale dans la configuration ne doit pas produire un double slash. */
    @Test
    void shouldNotProduceDoubleSlashInLinks() {
        ReflectionTestUtils.setField(emailService, "frontendUrl", "https://rentcar.vercel.app/");

        emailService.sendPasswordResetEmail("user@test.com", "tok");

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailTransport).send(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(), body.capture());

        assertThat(body.getValue()).doesNotContain(".app//reset-password");
    }
}
