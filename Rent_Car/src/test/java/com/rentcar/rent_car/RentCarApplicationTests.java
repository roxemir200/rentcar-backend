package com.rentcar.rent_car;

import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifie la creation du compte administrateur initial.
 * <p>
 * L'application est exposee sur Internet : ce sont les cas de NON-creation qui
 * comptent le plus ici. Un compte cree a partir d'identifiants par defaut
 * equivaudrait a publier un acces administrateur, et la faute ne se verrait
 * nulle part — le demarrage reussirait exactement de la meme facon.
 */
@ExtendWith(MockitoExtension.class)
class RentCarApplicationTests {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private final RentCarApplication application = new RentCarApplication();

    private void executer(String email, String motDePasse) throws Exception {
        CommandLineRunner runner =
                application.initAdmin(userRepository, passwordEncoder, email, motDePasse);
        runner.run();
    }

    @Test
    void applicationClassCanBeLoaded() {
        assertThat(RentCarApplication.class).isNotNull();
    }

    /** Le point d'entree delegue au demarrage Spring, sans logique propre. */
    @Test
    void shouldDelegateStartupToSpringApplication() {
        try (var springApplication = mockStatic(SpringApplication.class)) {
            String[] arguments = {"--server.port=0"};

            RentCarApplication.main(arguments);

            springApplication.verify(() -> SpringApplication.run(RentCarApplication.class, arguments));
        }
    }

    /**
     * Configuration absente : aucun compte n'est cree. C'est la regle
     * essentielle — la solution de facilite consisterait a retomber sur des
     * identifiants connus, ce qui ouvrirait l'administration a quiconque lit
     * le code source.
     */
    @Test
    void shouldNotCreateAnyAdmin_whenCredentialsAreMissing() throws Exception {
        executer("", "");

        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldNotCreateAnyAdmin_whenOnlyThePasswordIsMissing() throws Exception {
        executer("admin@rentcar.tn", "   ");

        verify(userRepository, never()).save(any());
    }

    /** Redemarrage : le compte existe deja, on ne le recree pas. */
    @Test
    void shouldNotRecreateAnExistingAdmin() throws Exception {
        when(userRepository.existsByEmail("admin@rentcar.tn")).thenReturn(true);

        executer("admin@rentcar.tn", "un-mot-de-passe-long");

        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldCreateTheAdminAccount_whenProperlyConfigured() throws Exception {
        when(userRepository.existsByEmail("admin@rentcar.tn")).thenReturn(false);
        when(passwordEncoder.encode("un-mot-de-passe-long")).thenReturn("$2a$empreinte");

        executer("admin@rentcar.tn", "un-mot-de-passe-long");

        ArgumentCaptor<User> creation = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(creation.capture());

        User admin = creation.getValue();
        assertThat(admin.getEmail()).isEqualTo("admin@rentcar.tn");
        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        assertThat(admin.getIsActive()).isTrue();
    }

    /**
     * Le mot de passe est toujours enregistre sous forme d'empreinte : une
     * fuite de la base ne doit pas livrer l'acces administrateur en clair.
     */
    @Test
    void shouldNeverStoreThePasswordInClearText() throws Exception {
        when(userRepository.existsByEmail("admin@rentcar.tn")).thenReturn(false);
        when(passwordEncoder.encode("un-mot-de-passe-long")).thenReturn("$2a$empreinte");

        executer("admin@rentcar.tn", "un-mot-de-passe-long");

        ArgumentCaptor<User> creation = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(creation.capture());

        assertThat(creation.getValue().getPassword())
                .isEqualTo("$2a$empreinte")
                .isNotEqualTo("un-mot-de-passe-long");
    }

    /**
     * Un mot de passe court est signale, mais n'empeche pas la creation :
     * refuser de demarrer laisserait l'exploitant sans acces du tout.
     */
    @Test
    void shouldStillCreateTheAdmin_whenThePasswordIsShort() throws Exception {
        when(userRepository.existsByEmail("admin@rentcar.tn")).thenReturn(false);
        when(passwordEncoder.encode("court")).thenReturn("$2a$empreinte");

        executer("admin@rentcar.tn", "court");

        verify(userRepository).save(any(User.class));
    }
}
