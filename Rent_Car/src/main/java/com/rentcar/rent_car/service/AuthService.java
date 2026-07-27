package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.request.*;
import com.rentcar.rent_car.dto.response.JwtResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.UserResponse;
import com.rentcar.rent_car.entity.User;

public interface AuthService {

    MessageResponse register(RegisterRequest request);

    JwtResponse login(LoginRequest request);

    UserResponse getCurrentUser(String email);
    MessageResponse updateProfile(String email, UpdateProfileRequest request);
    MessageResponse changePassword(String email, ChangePasswordRequest request);
    MessageResponse forgotPassword(ForgotPasswordRequest request);
    MessageResponse verifyResetToken(String token);
    MessageResponse resetPassword(ResetPasswordRequest request);
    void sendVerificationEmail(User user);

    // ✅ Vérifier l'email
    MessageResponse verifyEmail(String token);

    // ✅ Renvoyer l'email de vérification
    MessageResponse resendVerificationEmail(String email);

    // ✅ Vérifier si email existe
    boolean existsByEmail(String email);

    // ✅ Vérifier si téléphone existe
    boolean existsByPhoneNumber(String phoneNumber);
}