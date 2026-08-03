package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.LoginRequest;
import com.rentcar.rent_car.dto.request.RegisterRequest;
import com.rentcar.rent_car.dto.response.JwtResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @Test
    void shouldLogin_whenCredentialsAreValid() {
        JwtResponse jwt = JwtResponse.builder().token("jwt-token").build();
        when(authService.login(any(LoginRequest.class))).thenReturn(jwt);

        ResponseEntity<?> response = authController.login(new LoginRequest("a@test.com", "secret123"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldRegister_whenRequestIsValid() {
        when(authService.register(any(RegisterRequest.class))).thenReturn(MessageResponse.success("ok"));

        ResponseEntity<MessageResponse> response = authController.register(new RegisterRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
