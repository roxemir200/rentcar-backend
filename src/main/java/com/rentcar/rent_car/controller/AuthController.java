package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.LoginRequest;
import com.rentcar.rent_car.dto.request.RegisterRequest;
import com.rentcar.rent_car.dto.response.JwtResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.UserResponse;
import com.rentcar.rent_car.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // Inscription
    @PostMapping("/register")
    public ResponseEntity<MessageResponse> register(@Valid @RequestBody RegisterRequest request) {
        MessageResponse response = authService.register(request);

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Connexion
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            JwtResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(MessageResponse.error(e.getMessage()));
        }
    }

    // Profil utilisateur connecté
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@RequestParam String email) {
        UserResponse response = authService.getCurrentUser(email);
        return ResponseEntity.ok(response);
    }
}