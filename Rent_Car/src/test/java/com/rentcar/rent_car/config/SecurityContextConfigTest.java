package com.rentcar.rent_car.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityContextConfigTest {

    @Test
    void shouldInitSecurityContextStrategy() {
        SecurityContextConfig config = new SecurityContextConfig();
        config.initSecurityContextStrategy();

        assertThat(SecurityContextHolder.getContextHolderStrategy()).isNotNull();
    }
}
