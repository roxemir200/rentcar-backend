package com.rentcar.rent_car;

import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

@SpringBootApplication
@EnableScheduling // Active les tâches programmées
@EnableAsync // Active l'exécution asynchrone
@Slf4j
public class RentCarApplication {

    /** En dessous de cette longueur, le mot de passe administrateur est signalé comme faible. */
    private static final int LONGUEUR_MOT_DE_PASSE_RECOMMANDEE = 12;

    public static void main(String[] args) {
        SpringApplication.run(RentCarApplication.class, args);
    }

    /**
     * Crée le compte administrateur initial, uniquement s'il est explicitement configuré.
     * <p>
     * Les identifiants proviennent de {@code app.admin.email} et {@code app.admin.password},
     * eux-mêmes alimentés par les variables d'environnement {@code ADMIN_EMAIL} et
     * {@code ADMIN_PASSWORD}.
     * <p>
     * Trois règles, motivées par le fait que l'application est exposée sur Internet :
     * <ul>
     *   <li>aucune valeur par défaut — un mot de passe devinable dans le code source
     *       revient à publier un accès administrateur ;</li>
     *   <li>si la configuration est absente, le compte n'est pas créé, plutôt que de
     *       retomber sur des identifiers connus ;</li>
     *   <li>le mot de passe n'est jamais journalisé : les journaux d'un hébergeur sont
     *       conservés, indexés, et souvent lisibles par plusieurs personnes.</li>
     * </ul>
     */
    @Bean
    @Profile("!test")
    CommandLineRunner initAdmin(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.email:}") String adminEmail,
            @Value("${app.admin.password:}") String adminPassword) {

        return args -> {
            if (!StringUtils.hasText(adminEmail) || !StringUtils.hasText(adminPassword)) {
                log.warn("Compte administrateur non créé : ADMIN_EMAIL et ADMIN_PASSWORD ne sont pas définis.");
                return;
            }

            if (userRepository.existsByEmail(adminEmail)) {
                log.info("Compte administrateur déjà présent pour {}", adminEmail);
                return;
            }

            if (adminPassword.length() < LONGUEUR_MOT_DE_PASSE_RECOMMANDEE) {
                log.warn("Le mot de passe administrateur fait moins de {} caractères. "
                        + "Sur un service accessible publiquement, choisissez-en un plus long.",
                        LONGUEUR_MOT_DE_PASSE_RECOMMANDEE);
            }

            User admin = new User();
            admin.setFirstName("Admin");
            admin.setLastName("Principal");
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setPhoneNumber("0600000000");
            admin.setRole(Role.ADMIN);
            admin.setIsActive(true);
            userRepository.save(admin);

            // L'adresse est journalisée pour tracer la création ; le mot de passe, jamais.
            log.info("Compte administrateur créé pour {}", adminEmail);
        };
    }
}
