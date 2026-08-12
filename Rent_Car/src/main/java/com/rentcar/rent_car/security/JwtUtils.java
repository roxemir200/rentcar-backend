package com.rentcar.rent_car.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private int jwtExpiration;

    // Créer une clé secrète à partir de la chaîne
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    // Générer un token JWT
    public String generateToken(String email, String role) {
        return Jwts.builder()
                .subject(email)                          // Qui est connecté
                .claim("role", role)                     // Rôle (ADMIN/CLIENT)
                .issuedAt(new Date())                    // Date de création
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration)) // Date d'expiration
                .signWith(getSigningKey())               // Signature avec la clé secrète
                .compact();                              // Créer le token
    }

    // Extraire l'email du token
    public String getEmailFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    // Extraire le rôle du token
    public String getRoleFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("role", String.class);
    }

    // Valider le token
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            // Token invalide, expiré, vide ou mal formé
            return false;
        }
    }
}