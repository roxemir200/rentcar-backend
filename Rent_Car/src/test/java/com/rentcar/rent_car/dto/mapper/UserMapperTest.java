package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.RegisterRequest;
import com.rentcar.rent_car.dto.response.UserResponse;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class UserMapperTest {

    private UserMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new UserMapper();
    }

    @Test
    void shouldToEntity() {
        RegisterRequest request = new RegisterRequest();
        request.setFirstName("Jean");
        request.setLastName("Dupont");
        request.setEmail("jean@test.com");
        request.setPassword("secret123");
        request.setPhoneNumber("0612345678");
        request.setAddress("10 rue de Paris");
        request.setDrivingLicenseNumber("PERMIS123");

        User user = mapper.toEntity(request);

        assertThat(user.getFirstName()).isEqualTo("Jean");
        assertThat(user.getLastName()).isEqualTo("Dupont");
        assertThat(user.getEmail()).isEqualTo("jean@test.com");
        assertThat(user.getRole()).isEqualTo(Role.CLIENT);
        assertThat(user.getIsActive()).isTrue();
    }

    @Test
    void shouldToResponse() {
        LocalDateTime now = LocalDateTime.now();
        User user = new User();
        user.setId(1L);
        user.setFirstName("Jean");
        user.setLastName("Dupont");
        user.setEmail("jean@test.com");
        user.setPhoneNumber("0612345678");
        user.setAddress("10 rue de Paris");
        user.setDrivingLicenseNumber("PERMIS123");
        user.setRole(Role.CLIENT);
        user.setIsActive(true);
        user.setCreatedAt(now);

        UserResponse response = mapper.toResponse(user);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getFirstName()).isEqualTo("Jean");
        assertThat(response.getEmail()).isEqualTo("jean@test.com");
        assertThat(response.getRole()).isEqualTo(Role.CLIENT);
        assertThat(response.getIsActive()).isTrue();
        assertThat(response.getCreatedAt()).isEqualTo(now);
    }
}
