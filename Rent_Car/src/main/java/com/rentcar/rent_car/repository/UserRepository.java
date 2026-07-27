package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Trouver un utilisateur par email (pour le login)
    Optional<User> findByEmail(String email);

    // Vérifier si un email existe déjà (pour l'inscription)
    Boolean existsByEmail(String email);

    // Trouver tous les utilisateurs par rôle (pour l'admin)
    List<User> findByRole(Role role);

    // Trouver les utilisateurs actifs
    List<User> findByIsActiveTrue();
    Optional<User> findByVerificationToken(String token);

    Optional<User> findByEmailAndEmailVerifiedTrue(String email);

    Optional<User> findByPhoneNumber(String phoneNumber);

    Boolean existsByPhoneNumber(String phoneNumber);
}