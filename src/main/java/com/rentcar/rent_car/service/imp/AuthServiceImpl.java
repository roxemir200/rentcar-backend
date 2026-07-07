package com.rentcar.rent_car.service.impl;

import com.rentcar.rent_car.dto.mapper.UserMapper;
import com.rentcar.rent_car.dto.request.LoginRequest;
import com.rentcar.rent_car.dto.request.RegisterRequest;
import com.rentcar.rent_car.dto.response.JwtResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.UserResponse;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.security.JwtUtils;
import com.rentcar.rent_car.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;  // ← AJOUTÉ

    @Override
    public MessageResponse register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            return MessageResponse.error("Cet email est déjà utilisé");
        }

        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        return MessageResponse.success("Inscription réussie !");
    }

    @Override
    public JwtResponse login(LoginRequest request) {

        // Chercher l'utilisateur
        User user = userRepository.findByEmail(request.getEmail())
                .orElse(null);

        // Vérifications
        if (user == null) {
            throw new RuntimeException("Email ou mot de passe incorrect");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Email ou mot de passe incorrect");
        }

        if (!user.getIsActive()) {
            throw new RuntimeException("Votre compte est désactivé");
        }

        // Générer le VRAI token JWT
        String token = jwtUtils.generateToken(user.getEmail(), user.getRole().name());

        // Retourner la réponse avec le token
        return JwtResponse.builder()
                .token(token)
                .type("Bearer")
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .build();
    }

    @Override
    public UserResponse getCurrentUser(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        return userMapper.toResponse(user);
    }
}