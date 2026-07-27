package com.rentcar.rent_car;

import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // Active les tâches programmées
@EnableAsync // Active l'exécution asynchrone
public class RentCarApplication {

    public static void main(String[] args) {
        SpringApplication.run(RentCarApplication.class, args);
    }

    // Créer l'admin par défaut au démarrage si il n'existe pas
    @Bean
    CommandLineRunner initAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            String adminEmail = "admin@rentcar.com";

            if (!userRepository.existsByEmail(adminEmail)) {
                User admin = new User();
                admin.setFirstName("Admin");
                admin.setLastName("Principal");
                admin.setEmail(adminEmail);
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setPhoneNumber("0600000000");
                admin.setRole(Role.ADMIN);
                admin.setIsActive(true);
                userRepository.save(admin);

                System.out.println("====================================");
                System.out.println("✅ COMPTE ADMIN CRÉÉ");
                System.out.println("   Email    : admin@rentcar.com");
                System.out.println("   Password : admin123");
                System.out.println("====================================");
            } else {
                System.out.println("✅ Le compte admin existe déjà");
            }
        };
    }
}