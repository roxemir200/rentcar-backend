package com.rentcar.rent_car.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.filter.CorsFilter;

import static org.assertj.core.api.Assertions.assertThat;

class CorsConfigTest {

    @Test
    void shouldCreateCorsFilterBean() {
        CorsConfig config = new CorsConfig();
        CorsFilter filter = config.corsFilter();

        assertThat(filter).isNotNull();
    }
}
