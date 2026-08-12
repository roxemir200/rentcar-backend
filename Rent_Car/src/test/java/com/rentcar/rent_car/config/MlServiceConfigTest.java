package com.rentcar.rent_car.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;

class MlServiceConfigTest {

    @Test
    void shouldCreateMlRestClientBean() {
        MlServiceConfig config = new MlServiceConfig();
        config.setUrl("http://localhost:5001");
        config.setTimeoutMs(5000);
        config.setFallbackEnabled(true);

        RestClient restClient = config.mlRestClient();

        assertThat(restClient).isNotNull();
        assertThat(config.getUrl()).isEqualTo("http://localhost:5001");
        assertThat(config.getTimeoutMs()).isEqualTo(5000);
        assertThat(config.isFallbackEnabled()).isTrue();
    }
}
