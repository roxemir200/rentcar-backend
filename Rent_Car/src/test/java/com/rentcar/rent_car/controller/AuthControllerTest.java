package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.*;
import com.rentcar.rent_car.dto.response.JwtResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.UserResponse;
import com.rentcar.rent_car.security.UserDetailsImpl;
import com.rentcar.rent_car.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private UserDetailsImpl userDetails;

    @BeforeEach
    void setUp() {
        userDetails = new UserDetailsImpl(
                1L, "user@test.com", "password", null, true
        );
    }

    @Test
    void shouldRegister_whenSuccess() {
        when(authService.register(any(RegisterRequest.class)))
                .thenReturn(MessageResponse.success("Inscription réussie"));

        ResponseEntity<MessageResponse> response = authController.register(new RegisterRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().isSuccess()).isTrue();
    }

    @Test
    void shouldRegister_whenError() {
        when(authService.register(any(RegisterRequest.class)))
                .thenReturn(MessageResponse.error("Email pris"));

        ResponseEntity<MessageResponse> response = authController.register(new RegisterRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().isSuccess()).isFalse();
    }

    @Test
    void shouldLogin_whenCredentialsAreValid() {
        JwtResponse jwt = JwtResponse.builder().token("jwt-token").build();
        when(authService.login(any(LoginRequest.class))).thenReturn(jwt);

        ResponseEntity<?> response = authController.login(new LoginRequest("a@test.com", "secret123"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(jwt);
    }

    @Test
    void shouldLogin_whenCredentialsAreInvalid() {
        when(authService.login(any(LoginRequest.class))).thenThrow(new RuntimeException("Bad credentials"));

        ResponseEntity<?> response = authController.login(new LoginRequest("a@test.com", "wrong"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void shouldChangePassword_whenSuccess() {
        when(authService.changePassword(eq("user@test.com"), any(ChangePasswordRequest.class)))
                .thenReturn(MessageResponse.success("Mot de passe modifié"));

        ResponseEntity<MessageResponse> response = authController.changePassword(
                userDetails, new ChangePasswordRequest("old", "new")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldChangePassword_whenFailure() {
        when(authService.changePassword(eq("user@test.com"), any(ChangePasswordRequest.class)))
                .thenReturn(MessageResponse.error("Mot de passe actuel incorrect"));

        ResponseEntity<MessageResponse> response = authController.changePassword(
                userDetails, new ChangePasswordRequest("wrong", "new")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldGetCurrentUser() {
        UserResponse userResponse = new UserResponse();
        userResponse.setEmail("user@test.com");
        when(authService.getCurrentUser("user@test.com")).thenReturn(userResponse);

        ResponseEntity<UserResponse> response = authController.getCurrentUser("user@test.com");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getEmail()).isEqualTo("user@test.com");
    }

    @Test
    void shouldUpdateProfile_whenSuccess() {
        when(authService.updateProfile(eq("user@test.com"), any(UpdateProfileRequest.class)))
                .thenReturn(MessageResponse.success("Profil mis à jour"));

        ResponseEntity<MessageResponse> response = authController.updateProfile(
                new UpdateProfileRequest(), userDetails
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldUpdateProfile_whenFailure() {
        when(authService.updateProfile(eq("user@test.com"), any(UpdateProfileRequest.class)))
                .thenReturn(MessageResponse.error("Téléphone pris"));

        ResponseEntity<MessageResponse> response = authController.updateProfile(
                new UpdateProfileRequest(), userDetails
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldForgotPassword() {
        when(authService.forgotPassword(any(ForgotPasswordRequest.class)))
                .thenReturn(MessageResponse.success("Lien envoyé"));

        ResponseEntity<MessageResponse> response = authController.forgotPassword(new ForgotPasswordRequest("a@test.com"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldVerifyResetToken() {
        when(authService.verifyResetToken("token123")).thenReturn(MessageResponse.success("Token valide"));

        ResponseEntity<MessageResponse> response = authController.verifyResetToken("token123");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldResetPassword_whenSuccess() {
        when(authService.resetPassword(any(ResetPasswordRequest.class)))
                .thenReturn(MessageResponse.success("Mot de passe réinitialisé"));

        ResponseEntity<MessageResponse> response = authController.resetPassword(new ResetPasswordRequest("token", "new"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldResetPassword_whenFailure() {
        when(authService.resetPassword(any(ResetPasswordRequest.class)))
                .thenReturn(MessageResponse.error("Token expiré"));

        ResponseEntity<MessageResponse> response = authController.resetPassword(new ResetPasswordRequest("token", "new"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldVerifyEmail_whenSuccess() {
        when(authService.verifyEmail("valid-token")).thenReturn(MessageResponse.success("Email vérifié"));

        ResponseEntity<MessageResponse> response = authController.verifyEmail("valid-token");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldVerifyEmail_whenFailure() {
        when(authService.verifyEmail("invalid-token")).thenReturn(MessageResponse.error("Token invalide"));

        ResponseEntity<MessageResponse> response = authController.verifyEmail("invalid-token");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldResendVerification_whenSuccess() {
        when(authService.resendVerificationEmail("test@test.com")).thenReturn(MessageResponse.success("Email envoyé"));

        ResponseEntity<MessageResponse> response = authController.resendVerification("test@test.com");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldResendVerification_whenFailure() {
        when(authService.resendVerificationEmail("test@test.com")).thenReturn(MessageResponse.error("Déjà vérifié"));

        ResponseEntity<MessageResponse> response = authController.resendVerification("test@test.com");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldCheckEmail() {
        when(authService.existsByEmail("test@test.com")).thenReturn(true);

        ResponseEntity<Map<String, Boolean>> response = authController.checkEmail("test@test.com");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("exists")).isTrue();
    }

    @Test
    void shouldCheckPhone() {
        when(authService.existsByPhoneNumber("0600000000")).thenReturn(false);

        ResponseEntity<Map<String, Boolean>> response = authController.checkPhone("0600000000");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("exists")).isFalse();
    }
}

