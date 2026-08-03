package com.rentcar.rent_car.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilsTest {

    private JwtUtils jwtUtils;

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret", "MaCleSecreteTresLongueEtComplexePourMonProjetRentCar2026");
        ReflectionTestUtils.setField(jwtUtils, "jwtExpiration", 3600000);
    }

    @Test
    void shouldGenerateAndValidateToken() {
        String token = jwtUtils.generateToken("client@test.com", "CLIENT");

        assertThat(token).isNotBlank();
        assertThat(jwtUtils.validateToken(token)).isTrue();
        assertThat(jwtUtils.getEmailFromToken(token)).isEqualTo("client@test.com");
        assertThat(jwtUtils.getRoleFromToken(token)).isEqualTo("CLIENT");
    }

    @Test
    void shouldRejectInvalidToken() {
        assertThat(jwtUtils.validateToken("invalid-token")).isFalse();
    }
}
