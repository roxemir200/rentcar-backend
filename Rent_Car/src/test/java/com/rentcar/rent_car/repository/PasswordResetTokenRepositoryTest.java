package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.PasswordResetToken;
import com.rentcar.rent_car.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetTokenRepositoryTest {

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    private PasswordResetToken resetToken;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(1L);
        user.setEmail("tokenuser@test.com");

        resetToken = new PasswordResetToken();
        resetToken.setId(10L);
        resetToken.setToken("reset-token-xyz");
        resetToken.setUser(user);
        resetToken.setExpiryDate(LocalDateTime.now().plusHours(1));
        resetToken.setUsed(false);
    }

    @Test
    void shouldFindByTokenAndUsedFalse() {
        when(tokenRepository.findByTokenAndUsedFalse("reset-token-xyz")).thenReturn(Optional.of(resetToken));

        Optional<PasswordResetToken> found = tokenRepository.findByTokenAndUsedFalse("reset-token-xyz");

        assertThat(found).isPresent();
        assertThat(found.get().isUsed()).isFalse();
    }

    @Test
    void shouldFindByToken() {
        when(tokenRepository.findByToken("reset-token-xyz")).thenReturn(Optional.of(resetToken));

        Optional<PasswordResetToken> found = tokenRepository.findByToken("reset-token-xyz");

        assertThat(found).isPresent();
    }

    @Test
    void shouldDeleteByExpiryDateBefore() {
        LocalDateTime now = LocalDateTime.now();

        tokenRepository.deleteByExpiryDateBefore(now);

        verify(tokenRepository).deleteByExpiryDateBefore(any(LocalDateTime.class));
    }
}
