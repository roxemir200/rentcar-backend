package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.mapper.UserMapper;
import com.rentcar.rent_car.dto.response.UserResponse;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private UserController userController;

    @Test
    void shouldReturnSupportUser_whenAdminExists() {
        User admin = new User();
        admin.setId(1L);
        admin.setRole(Role.ADMIN);

        when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(admin));
        when(userMapper.toResponse(admin))
                .thenReturn(UserResponse.builder().id(1L).role(Role.ADMIN).build());

        ResponseEntity<UserResponse> response = userController.getSupportUser();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(1L);
    }

    @Test
    void shouldReturnNotFound_whenNoAdminExists() {
        when(userRepository.findByRole(Role.ADMIN)).thenReturn(Collections.emptyList());

        ResponseEntity<UserResponse> response = userController.getSupportUser();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    /**
     * L'endpoint ne doit jamais exposer l'entite : elle porte le mot de passe
     * hache et des collections qui bouclent a la serialisation.
     */
    @Test
    void shouldReturnDtoWithoutPasswordNorCollections() {
        User admin = new User();
        admin.setId(1L);
        admin.setEmail("admin@rentcar.com");
        admin.setPassword("$2a$10$hash-qui-ne-doit-pas-sortir");
        admin.setRole(Role.ADMIN);

        when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(admin));
        when(userMapper.toResponse(admin)).thenReturn(
                UserResponse.builder().id(1L).email("admin@rentcar.com").role(Role.ADMIN).build());

        ResponseEntity<UserResponse> response = userController.getSupportUser();

        assertThat(response.getBody()).isInstanceOf(UserResponse.class);
        assertThat(response.getBody().getEmail()).isEqualTo("admin@rentcar.com");
    }
}
