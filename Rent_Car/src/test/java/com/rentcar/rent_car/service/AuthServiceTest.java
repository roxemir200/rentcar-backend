package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.mapper.UserMapper;
import com.rentcar.rent_car.dto.request.ChangePasswordRequest;
import com.rentcar.rent_car.dto.request.LoginRequest;
import com.rentcar.rent_car.dto.request.RegisterRequest;
import com.rentcar.rent_car.dto.response.JwtResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.PasswordResetTokenRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.security.JwtUtils;
import com.rentcar.rent_car.service.imp.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthServiceImpl authService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setEmail("client@test.com");
        user.setPassword("encoded");
        user.setRole(Role.CLIENT);
        user.setIsActive(true);
        user.setEmailVerified(true);
        user.setFirstName("Alice");
        user.setLastName("Durand");
    }

    @Test
    void shouldLogin_whenCredentialsAreValid() {
        LoginRequest request = new LoginRequest("client@test.com", "secret123");
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "encoded")).thenReturn(true);
        when(jwtUtils.generateToken("client@test.com", Role.CLIENT.name())).thenReturn("jwt-token");

        JwtResponse result = authService.login(request);

        assertThat(result.getToken()).isEqualTo("jwt-token");
        assertThat(result.getEmail()).isEqualTo("client@test.com");
    }

    @Test
    void shouldThrow_whenUserNotFoundDuringLogin() {
        LoginRequest request = new LoginRequest("missing@test.com", "secret123");
        when(userRepository.findByEmail("missing@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Email ou mot de passe incorrect");
    }

    @Test
    void shouldThrow_whenAccountIsDisabled() {
        user.setIsActive(false);
        LoginRequest request = new LoginRequest("client@test.com", "secret123");
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "encoded")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("désactivé");
    }

    @Test
    void shouldRegisterUser_whenEmailIsAvailable() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@test.com");
        request.setPassword("secret123");
        when(userRepository.existsByEmail("new@test.com")).thenReturn(false);
        when(userMapper.toEntity(request)).thenReturn(user);
        when(passwordEncoder.encode("secret123")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(user);
        doNothing().when(emailService).sendEmail(anyString(), anyString(), anyString());

        MessageResponse result = authService.register(request);

        assertThat(result.isSuccess()).isTrue();
        verify(userRepository).save(any(User.class));
    }

    @Test
    void shouldReturnError_whenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@test.com");
        when(userRepository.existsByEmail("existing@test.com")).thenReturn(true);

        MessageResponse result = authService.register(request);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("déjà utilisé");
    }

    @Test
    void shouldChangePassword_whenCurrentPasswordMatches() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("old");
        request.setNewPassword("newPassword");
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("old", "encoded")).thenReturn(true);
        when(passwordEncoder.matches("newPassword", "encoded")).thenReturn(false);
        when(passwordEncoder.encode("newPassword")).thenReturn("new-encoded");
        when(userRepository.save(any(User.class))).thenReturn(user);

        MessageResponse result = authService.changePassword("client@test.com", request);

        assertThat(result.isSuccess()).isTrue();
        verify(userRepository).save(any(User.class));
    }
}
