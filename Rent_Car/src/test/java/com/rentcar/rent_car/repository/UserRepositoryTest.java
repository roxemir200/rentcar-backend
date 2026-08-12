package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserRepositoryTest {

    @Mock
    private UserRepository userRepository;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setEmail("test@test.com");
        user.setPassword("encoded_pass");
        user.setFirstName("Jean");
        user.setLastName("Dupont");
        user.setPhoneNumber("0612345678");
        user.setRole(Role.CLIENT);
        user.setIsActive(true);
        user.setEmailVerified(true);
        user.setVerificationToken("vtoken123");
    }

    @Test
    void shouldFindByEmail() {
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));

        Optional<User> found = userRepository.findByEmail("test@test.com");

        assertThat(found).isPresent();
        assertThat(found.get().getFirstName()).isEqualTo("Jean");
    }

    @Test
    void shouldExistsByEmail() {
        when(userRepository.existsByEmail("test@test.com")).thenReturn(true);
        when(userRepository.existsByEmail("other@test.com")).thenReturn(false);

        assertThat(userRepository.existsByEmail("test@test.com")).isTrue();
        assertThat(userRepository.existsByEmail("other@test.com")).isFalse();
    }

    @Test
    void shouldFindByRole() {
        when(userRepository.findByRole(Role.CLIENT)).thenReturn(List.of(user));

        List<User> clients = userRepository.findByRole(Role.CLIENT);

        assertThat(clients).hasSize(1);
    }

    @Test
    void shouldFindByIsActiveTrue() {
        when(userRepository.findByIsActiveTrue()).thenReturn(List.of(user));

        List<User> activeUsers = userRepository.findByIsActiveTrue();

        assertThat(activeUsers).hasSize(1);
    }

    @Test
    void shouldFindByVerificationToken() {
        when(userRepository.findByVerificationToken("vtoken123")).thenReturn(Optional.of(user));

        Optional<User> found = userRepository.findByVerificationToken("vtoken123");

        assertThat(found).isPresent();
    }

    @Test
    void shouldFindByEmailAndEmailVerifiedTrue() {
        when(userRepository.findByEmailAndEmailVerifiedTrue("test@test.com")).thenReturn(Optional.of(user));

        Optional<User> found = userRepository.findByEmailAndEmailVerifiedTrue("test@test.com");

        assertThat(found).isPresent();
    }

    @Test
    void shouldFindByPhoneNumber() {
        when(userRepository.findByPhoneNumber("0612345678")).thenReturn(Optional.of(user));

        Optional<User> found = userRepository.findByPhoneNumber("0612345678");

        assertThat(found).isPresent();
    }

    @Test
    void shouldExistsByPhoneNumber() {
        when(userRepository.existsByPhoneNumber("0612345678")).thenReturn(true);

        Boolean exists = userRepository.existsByPhoneNumber("0612345678");

        assertThat(exists).isTrue();
    }
}
