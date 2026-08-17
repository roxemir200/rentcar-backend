package com.rentcar.rent_car.service.imp;

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
import com.rentcar.rent_car.service.AuthService;
import com.rentcar.rent_car.service.EmailService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {
    private final PasswordResetTokenRepository tokenRepository;

    private final EmailService emailService;

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;  // ← AJOUTÉ

    /**
     * Base des liens de verification, pilotee par {@code app.frontend.url}.
     * La valeur d'initialisation garde la classe utilisable hors contexte Spring.
     */
    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl = "http://localhost:5173";

    // service/imp/AuthServiceImpl.java

    @Override
    public MessageResponse register(RegisterRequest request) {
        // 1. Vérifier si l'email existe déjà
        if (userRepository.existsByEmail(request.getEmail())) {
            return MessageResponse.error("Cet email est déjà utilisé");
        }

        // 2. Convertir DTO → Entity
        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        // ✅ 3. Générer un token de vérification
        String verificationToken = UUID.randomUUID().toString();
        user.setVerificationToken(verificationToken);
        user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(24));
        user.setEmailVerified(false);  // ✅ Par défaut, non vérifié

        // 4. Sauvegarder
        userRepository.save(user);

        // ✅ 5. Envoyer l'email de vérification
        sendVerificationEmail(user);

        return MessageResponse.success(
                "Inscription réussie ! Un email de vérification vous a été envoyé."
        );
    }

    @Override
    public void sendVerificationEmail(User user) {
        String base = frontendUrl.endsWith("/")
                ? frontendUrl.substring(0, frontendUrl.length() - 1)
                : frontendUrl;
        String verificationLink = base + "/verify-email?token=" + user.getVerificationToken();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(user.getEmail());
        message.setSubject("Vérifiez votre email - RentCar");
        message.setText(
                "Bonjour " + user.getFirstName() + ",\n\n"
                        + "Merci de vous être inscrit sur RentCar !\n\n"
                        + "Pour activer votre compte, veuillez cliquer sur le lien ci-dessous :\n"
                        + verificationLink + "\n\n"
                        + "Ce lien est valable 24 heures.\n\n"
                        + "Si vous n'avez pas créé de compte, ignorez cet email.\n\n"
                        + "Cordialement,\n"
                        + "L'équipe RentCar"
        );

        try {
            emailService.sendEmail(user.getEmail(), message.getSubject(), message.getText());
            log.info("Email de vérification envoyé à {}", user.getEmail());
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email de vérification à {}", user.getEmail(), e);
        }
    }

    @Override
    @Transactional
    public MessageResponse verifyEmail(String token) {
        // 1. Chercher l'utilisateur avec ce token
        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new RuntimeException("Token de vérification invalide"));

        // 2. Vérifier si le token a expiré
        if (user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            return MessageResponse.error("Le token de vérification a expiré");
        }

        // 3. Vérifier si l'email est déjà vérifié
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return MessageResponse.error("Cet email est déjà vérifié");
        }

        // 4. Valider l'email
        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.save(user);

        return MessageResponse.success("Email vérifié avec succès !");
    }

    @Override
    public MessageResponse resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return MessageResponse.error("Cet email est déjà vérifié");
        }

        // Générer un nouveau token
        String newToken = UUID.randomUUID().toString();
        user.setVerificationToken(newToken);
        user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        sendVerificationEmail(user);

        return MessageResponse.success("Un nouvel email de vérification a été envoyé");
    }
    @Override
    @Transactional
    public MessageResponse changePassword(String email, ChangePasswordRequest request) {

        // 1. Trouver l'utilisateur
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // 2. Vérifier le mot de passe actuel
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            return MessageResponse.error("Mot de passe actuel incorrect");
        }

        // 3. Vérifier que le nouveau mot de passe est différent
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            return MessageResponse.error("Le nouveau mot de passe doit être différent de l'ancien");
        }

        // 4. Hasher et sauvegarder le nouveau mot de passe
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // 5. Retourner le succès
        return MessageResponse.success("Mot de passe modifié avec succès");
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

        // ✅ Vérifier si l'email est vérifié (sauf pour admin)
        if (user.getRole() != Role.ADMIN && !Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new RuntimeException("Veuillez vérifier votre email avant de vous connecter");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
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
    @Override
    @Transactional
    public MessageResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Vérifier si le numéro de téléphone est déjà utilisé par un autre utilisateur
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            User existingUserWithPhone = userRepository.findByPhoneNumber(request.getPhoneNumber()).orElse(null);
            if (existingUserWithPhone != null && !existingUserWithPhone.getId().equals(user.getId())) {
                return MessageResponse.error("Ce numéro de téléphone est déjà utilisé");
            }
        }

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setAddress(request.getAddress());
        user.setDrivingLicenseNumber(request.getDrivingLicenseNumber());
        userRepository.save(user);

        return MessageResponse.success("Profil mis à jour avec succès", userMapper.toResponse(user));
    }
    @Override
    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        // 1. Vérifier si l'email existe
        User user = userRepository.findByEmail(request.getEmail())
                .orElse(null);

        if (user == null) {
            // ⚠️ Pour des raisons de sécurité, on ne dit pas si l'email existe
            // On renvoie toujours "Email envoyé" même si l'email n'existe pas
            return MessageResponse.success("Si l'email existe, un lien a été envoyé");
        }

        // 2. Supprimer les anciens tokens
        tokenRepository.deleteByExpiryDateBefore(LocalDateTime.now());

        // 3. Générer un nouveau token
        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setToken(token);
        resetToken.setUser(user);
        resetToken.setUsed(false);
        tokenRepository.save(resetToken);

        // 4. Envoyer l'email
        try {
            emailService.sendPasswordResetEmail(user.getEmail(), token);
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email à {}: {}", user.getEmail(), e.getMessage(), e);
            return MessageResponse.error("Erreur lors de l'envoi de l'email");
        }

        return MessageResponse.success("Un lien de réinitialisation a été envoyé à votre email");
    }

    @Override
    public MessageResponse verifyResetToken(String token) {
        PasswordResetToken resetToken = tokenRepository.findByTokenAndUsedFalse(token)
                .orElse(null);

        if (resetToken == null) {
            return MessageResponse.error("Token invalide");
        }

        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            return MessageResponse.error("Token expiré");
        }

        return MessageResponse.success("Token valide");
    }

    @Override
    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        // 1. Vérifier le token
        PasswordResetToken resetToken = tokenRepository.findByTokenAndUsedFalse(request.getToken())
                .orElse(null);

        if (resetToken == null) {
            return MessageResponse.error("Token invalide");
        }

        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            return MessageResponse.error("Token expiré. Veuillez refaire une demande.");
        }

        // 2. Vérifier que le nouveau mot de passe est différent
        User user = resetToken.getUser();
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            return MessageResponse.error("Le nouveau mot de passe doit être différent de l'ancien");
        }

        // 3. Mettre à jour le mot de passe
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // 4. Marquer le token comme utilisé
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        return MessageResponse.success("Mot de passe réinitialisé avec succès");
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    public boolean existsByPhoneNumber(String phoneNumber) {
        return userRepository.existsByPhoneNumber(phoneNumber);
    }

}