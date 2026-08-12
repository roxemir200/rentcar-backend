package com.rentcar.rent_car.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    @Test
    void shouldSendPasswordResetEmail() {
        emailService.sendPasswordResetEmail("user@test.com", "reset-token-123");

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());

        SimpleMailMessage captured = captor.getValue();
        assertThat(captured.getTo()).containsExactly("user@test.com");
        assertThat(captured.getSubject()).contains("Réinitialisation");
        assertThat(captured.getText()).contains("reset-token-123");
    }

    @Test
    void shouldSendGenericEmail() {
        emailService.sendEmail("to@test.com", "Subject Test", "Hello Body");

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());

        SimpleMailMessage captured = captor.getValue();
        assertThat(captured.getTo()).containsExactly("to@test.com");
        assertThat(captured.getSubject()).isEqualTo("Subject Test");
        assertThat(captured.getText()).isEqualTo("Hello Body");
    }
}
