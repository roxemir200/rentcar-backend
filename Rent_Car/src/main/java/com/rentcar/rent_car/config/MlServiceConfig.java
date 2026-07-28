package com.rentcar.rent_car.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
@ConfigurationProperties(prefix = "ml.service")
@Getter
@Setter
public class MlServiceConfig {

    private String url = "http://localhost:5001";
    private int timeoutMs = 8000;
    private boolean fallbackEnabled = true;

    @Bean("mlRestClient")
    public RestClient mlRestClient() {
        int ms = Math.max(1000, timeoutMs);
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(ms));
        factory.setReadTimeout(Duration.ofMillis(ms));
        return RestClient.builder()
                .baseUrl(url)
                .requestFactory(factory)
                .build();
    }
}
