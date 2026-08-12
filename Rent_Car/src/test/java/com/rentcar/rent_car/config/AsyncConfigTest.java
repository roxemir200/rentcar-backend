package com.rentcar.rent_car.config;

import org.junit.jupiter.api.Test;

import java.util.concurrent.Executor;

import static org.assertj.core.api.Assertions.assertThat;

class AsyncConfigTest {

    @Test
    void shouldCreateTaskExecutorBean() {
        AsyncConfig config = new AsyncConfig();
        Executor executor = config.taskExecutor();

        assertThat(executor).isNotNull();
    }
}
