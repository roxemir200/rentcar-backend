package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.mapper.UserMapper;
import com.rentcar.rent_car.dto.request.*;
import com.rentcar.rent_car.dto.response.JwtResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.UserResponse;
import com.rentcar.rent_car.entity.PasswordResetToken;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.PasswordResetTokenRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.security.JwtUtils;
import com.rentcar.rent_car.service.imp.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
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
        user.setPhoneNumber("0600000000");
    }

    // --- REGISTER & VERIFY EMAIL TESTS ---

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
        assertThat(result.getMessage()).contains("Inscription réussie");
        verify(userRepository).save(any(User.class));
        verify(emailService).sendEmail(anyString(), anyString(), anyString());
    }

    @Test
    void shouldReturnError_whenRegisterEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@test.com");
        when(userRepository.existsByEmail("existing@test.com")).thenReturn(true);

        MessageResponse result = authService.register(request);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("déjà utilisé");
    }

    @Test
    void shouldHandleEmailServiceException_whenSendingVerificationEmail() {
        doThrow(new RuntimeException("Mail server down"))
                .when(emailService).sendEmail(anyString(), anyString(), anyString());

        authService.sendVerificationEmail(user);

        // Does not throw, logs error
        verify(emailService).sendEmail(anyString(), anyString(), anyString());
    }

    /**
     * L'URL du frontend est saisie a la main sur l'hebergeur, souvent avec une
     * barre finale. Sans ce nettoyage, le lien de verification comporte un
     * double « // » : la plupart des routeurs frontaux ne le reconnaissent
     * pas, et le compte reste inactivable.
     */
    @Test
    void shouldBuildTheVerificationLink_whateverTheTrailingSlash() {
        user.setVerificationToken("jeton-123");
        ArgumentCaptor<String> corps = ArgumentCaptor.forClass(String.class);

        org.springframework.test.util.ReflectionTestUtils.setField(
                authService, "frontendUrl", "https://rentcar.example/");
        authService.sendVerificationEmail(user);

        org.springframework.test.util.ReflectionTestUtils.setField(
                authService, "frontendUrl", "https://rentcar.example");
        authService.sendVerificationEmail(user);

        verify(emailService, times(2))
                .sendEmail(anyString(), anyString(), corps.capture());
        assertThat(corps.getAllValues())
                .allMatch(texte -> texte.contains("https://rentcar.example/verify-email?token=jeton-123"))
                .allMatch(texte -> !texte.contains("example//"));
    }

    @Test
    void shouldVerifyEmail_whenTokenIsValid() {
        user.setEmailVerified(false);
        user.setVerificationToken("valid-token");
        user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(1));
        when(userRepository.findByVerificationToken("valid-token")).thenReturn(Optional.of(user));

        MessageResponse response = authService.verifyEmail("valid-token");

        assertThat(response.isSuccess()).isTrue();
        assertThat(user.getEmailVerified()).isTrue();
        assertThat(user.getVerificationToken()).isNull();
        verify(userRepository).save(user);
    }

    @Test
    void shouldThrow_whenVerifyEmailTokenNotFound() {
        when(userRepository.findByVerificationToken("invalid")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.verifyEmail("invalid"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("invalide");
    }

    @Test
    void shouldReturnError_whenVerifyEmailTokenExpired() {
        user.setEmailVerified(false);
        user.setVerificationToken("expired-token");
        user.setVerificationTokenExpiry(LocalDateTime.now().minusHours(1));
        when(userRepository.findByVerificationToken("expired-token")).thenReturn(Optional.of(user));

        MessageResponse response = authService.verifyEmail("expired-token");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("expiré");
    }

    @Test
    void shouldReturnError_whenVerifyEmailAlreadyVerified() {
        user.setEmailVerified(true);
        user.setVerificationToken("token");
        user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(1));
        when(userRepository.findByVerificationToken("token")).thenReturn(Optional.of(user));

        MessageResponse response = authService.verifyEmail("token");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("déjà vérifié");
    }

    @Test
    void shouldResendVerificationEmail_whenNotVerified() {
        user.setEmailVerified(false);
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        doNothing().when(emailService).sendEmail(anyString(), anyString(), anyString());

        MessageResponse response = authService.resendVerificationEmail("client@test.com");

        assertThat(response.isSuccess()).isTrue();
        verify(userRepository).save(user);
        verify(emailService).sendEmail(anyString(), anyString(), anyString());
    }

    @Test
    void shouldThrow_whenResendVerificationEmailUserNotFound() {
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.resendVerificationEmail("unknown@test.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("non trouvé");
    }

    @Test
    void shouldReturnError_whenResendVerificationEmailAlreadyVerified() {
        user.setEmailVerified(true);
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));

        MessageResponse response = authService.resendVerificationEmail("client@test.com");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("déjà vérifié");
    }

    // --- LOGIN TESTS ---

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
    void shouldThrow_whenPasswordIncorrectDuringLogin() {
        LoginRequest request = new LoginRequest("client@test.com", "wrongpass");
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpass", "encoded")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Email ou mot de passe incorrect");
    }

    @Test
    void shouldThrow_whenEmailNotVerifiedForClientLogin() {
        user.setEmailVerified(false);
        user.setRole(Role.CLIENT);
        LoginRequest request = new LoginRequest("client@test.com", "secret123");
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "encoded")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("vérifier votre email");
    }

    @Test
    void shouldAllowLogin_whenEmailNotVerifiedButRoleIsAdmin() {
        user.setEmailVerified(false);
        user.setRole(Role.ADMIN);
        LoginRequest request = new LoginRequest("admin@test.com", "secret123");
        user.setEmail("admin@test.com");
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "encoded")).thenReturn(true);
        when(jwtUtils.generateToken("admin@test.com", Role.ADMIN.name())).thenReturn("jwt-admin");

        JwtResponse result = authService.login(request);

        assertThat(result.getToken()).isEqualTo("jwt-admin");
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

    // --- CHANGE PASSWORD TESTS ---

    @Test
    void shouldChangePassword_whenCurrentPasswordMatches() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("old");
        request.setNewPassword("newPassword");
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("old", "encoded")).thenReturn(true);
        when(passwordEncoder.matches("newPassword", "encoded")).thenReturn(false);
        when(passwordEncoder.encode("newPassword")).thenReturn("new-encoded");

        MessageResponse result = authService.changePassword("client@test.com", request);

        assertThat(result.isSuccess()).isTrue();
        verify(userRepository).save(user);
    }

    @Test
    void shouldThrow_whenChangePasswordUserNotFound() {
        ChangePasswordRequest request = new ChangePasswordRequest("old", "new");
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.changePassword("unknown@test.com", request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Utilisateur non trouvé");
    }

    @Test
    void shouldReturnError_whenCurrentPasswordIncorrect() {
        ChangePasswordRequest request = new ChangePasswordRequest("wrong", "new");
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "encoded")).thenReturn(false);

        MessageResponse result = authService.changePassword("client@test.com", request);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("actuel incorrect");
    }

    @Test
    void shouldReturnError_whenNewPasswordIsSameAsCurrent() {
        ChangePasswordRequest request = new ChangePasswordRequest("same", "same");
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("same", "encoded")).thenReturn(true);

        MessageResponse result = authService.changePassword("client@test.com", request);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("différent");
    }

    // --- USER PROFILE & DETAILS TESTS ---

    @Test
    void shouldGetCurrentUser_whenUserExists() {
        UserResponse mockResponse = new UserResponse();
        mockResponse.setEmail("client@test.com");
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        when(userMapper.toResponse(user)).thenReturn(mockResponse);

        UserResponse response = authService.getCurrentUser("client@test.com");

        assertThat(response.getEmail()).isEqualTo("client@test.com");
    }

    @Test
    void shouldThrow_whenGetCurrentUserNotFound() {
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getCurrentUser("unknown@test.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Utilisateur non trouvé");
    }

    @Test
    void shouldUpdateProfile_successfully() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFirstName("Bob");
        request.setLastName("Smith");
        request.setPhoneNumber("0700000000");

        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        when(userRepository.findByPhoneNumber("0700000000")).thenReturn(Optional.empty());
        when(userMapper.toResponse(user)).thenReturn(new UserResponse());

        MessageResponse response = authService.updateProfile("client@test.com", request);

        assertThat(response.isSuccess()).isTrue();
        assertThat(user.getFirstName()).isEqualTo("Bob");
        assertThat(user.getPhoneNumber()).isEqualTo("0700000000");
        verify(userRepository).save(user);
    }

    @Test
    void shouldReturnError_whenUpdateProfilePhoneTakenByAnotherUser() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setPhoneNumber("0700000000");

        User otherUser = new User();
        otherUser.setId(2L);

        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        when(userRepository.findByPhoneNumber("0700000000")).thenReturn(Optional.of(otherUser));

        MessageResponse response = authService.updateProfile("client@test.com", request);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("déjà utilisé");
    }

    @Test
    void shouldUpdateProfile_whenPhoneBelongsToSameUser() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setPhoneNumber("0600000000");

        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        when(userRepository.findByPhoneNumber("0600000000")).thenReturn(Optional.of(user));
        when(userMapper.toResponse(user)).thenReturn(new UserResponse());

        MessageResponse response = authService.updateProfile("client@test.com", request);

        assertThat(response.isSuccess()).isTrue();
    }

    // --- FORGOT & RESET PASSWORD TESTS ---

    @Test
    void shouldReturnSuccess_whenForgotPasswordUserNotFoundForSecurity() {
        ForgotPasswordRequest request = new ForgotPasswordRequest("missing@test.com");
        when(userRepository.findByEmail("missing@test.com")).thenReturn(Optional.empty());

        MessageResponse response = authService.forgotPassword(request);

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).contains("Si l'email existe");
    }

    @Test
    void shouldForgotPassword_sendEmailSuccessfully() {
        ForgotPasswordRequest request = new ForgotPasswordRequest("client@test.com");
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        doNothing().when(tokenRepository).deleteByExpiryDateBefore(any(LocalDateTime.now().getClass()));
        when(tokenRepository.save(any(PasswordResetToken.class))).thenAnswer(i -> i.getArgument(0));
        doNothing().when(emailService).sendPasswordResetEmail(anyString(), anyString());

        MessageResponse response = authService.forgotPassword(request);

        assertThat(response.isSuccess()).isTrue();
        verify(emailService).sendPasswordResetEmail(eq("client@test.com"), anyString());
    }

    @Test
    void shouldReturnError_whenForgotPasswordEmailSendingFails() {
        ForgotPasswordRequest request = new ForgotPasswordRequest("client@test.com");
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("Mail error"))
                .when(emailService).sendPasswordResetEmail(anyString(), anyString());

        MessageResponse response = authService.forgotPassword(request);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Erreur lors de l'envoi");
    }

    @Test
    void shouldVerifyResetToken_returnsErrorWhenNullOrUsed() {
        when(tokenRepository.findByTokenAndUsedFalse("invalid")).thenReturn(Optional.empty());

        MessageResponse response = authService.verifyResetToken("invalid");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Token invalide");
    }

    @Test
    void shouldVerifyResetToken_returnsErrorWhenExpired() {
        PasswordResetToken token = new PasswordResetToken();
        token.setExpiryDate(LocalDateTime.now().minusMinutes(10));
        when(tokenRepository.findByTokenAndUsedFalse("expired")).thenReturn(Optional.of(token));

        MessageResponse response = authService.verifyResetToken("expired");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Token expiré");
    }

    @Test
    void shouldVerifyResetToken_returnsSuccessWhenValid() {
        PasswordResetToken token = new PasswordResetToken();
        token.setExpiryDate(LocalDateTime.now().plusMinutes(10));
        when(tokenRepository.findByTokenAndUsedFalse("valid")).thenReturn(Optional.of(token));

        MessageResponse response = authService.verifyResetToken("valid");

        assertThat(response.isSuccess()).isTrue();
    }

    @Test
    void shouldResetPassword_returnsErrorWhenTokenInvalid() {
        ResetPasswordRequest request = new ResetPasswordRequest("invalid", "newpass");
        when(tokenRepository.findByTokenAndUsedFalse("invalid")).thenReturn(Optional.empty());

        MessageResponse response = authService.resetPassword(request);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Token invalide");
    }

    @Test
    void shouldResetPassword_returnsErrorWhenTokenExpired() {
        PasswordResetToken token = new PasswordResetToken();
        token.setExpiryDate(LocalDateTime.now().minusMinutes(1));
        ResetPasswordRequest request = new ResetPasswordRequest("expired", "newpass");
        when(tokenRepository.findByTokenAndUsedFalse("expired")).thenReturn(Optional.of(token));

        MessageResponse response = authService.resetPassword(request);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Token expiré");
    }

    @Test
    void shouldResetPassword_returnsErrorWhenNewPasswordSameAsOld() {
        PasswordResetToken token = new PasswordResetToken();
        token.setExpiryDate(LocalDateTime.now().plusMinutes(10));
        token.setUser(user);
        ResetPasswordRequest request = new ResetPasswordRequest("valid", "samepass");

        when(tokenRepository.findByTokenAndUsedFalse("valid")).thenReturn(Optional.of(token));
        when(passwordEncoder.matches("samepass", "encoded")).thenReturn(true);

        MessageResponse response = authService.resetPassword(request);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("différent");
    }

    @Test
    void shouldResetPassword_successfully() {
        PasswordResetToken token = new PasswordResetToken();
        token.setExpiryDate(LocalDateTime.now().plusMinutes(10));
        token.setUser(user);
        token.setUsed(false);
        ResetPasswordRequest request = new ResetPasswordRequest("valid", "newpass");

        when(tokenRepository.findByTokenAndUsedFalse("valid")).thenReturn(Optional.of(token));
        when(passwordEncoder.matches("newpass", "encoded")).thenReturn(false);
        when(passwordEncoder.encode("newpass")).thenReturn("encoded-new");

        MessageResponse response = authService.resetPassword(request);

        assertThat(response.isSuccess()).isTrue();
        assertThat(token.isUsed()).isTrue();
        verify(userRepository).save(user);
        verify(tokenRepository).save(token);
    }

    // --- CHECK EXISTS TESTS ---

    @Test
    void shouldCheckExistsByEmail() {
        when(userRepository.existsByEmail("test@test.com")).thenReturn(true);
        assertThat(authService.existsByEmail("test@test.com")).isTrue();
    }

    @Test
    void shouldCheckExistsByPhoneNumber() {
        when(userRepository.existsByPhoneNumber("12345")).thenReturn(true);
        assertThat(authService.existsByPhoneNumber("12345")).isTrue();
    }
}

