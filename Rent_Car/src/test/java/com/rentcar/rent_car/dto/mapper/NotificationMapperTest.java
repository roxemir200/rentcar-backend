package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.response.NotificationResponse;
import com.rentcar.rent_car.entity.Notification;
import com.rentcar.rent_car.enums.NotificationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationMapperTest {

    private NotificationMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new NotificationMapper();
    }

    @Test
    void shouldToResponse() {
        LocalDateTime now = LocalDateTime.now();
        Notification notification = new Notification();
        notification.setId(10L);
        notification.setTitle("Titre");
        notification.setMessage("Message");
        notification.setType(NotificationType.SYSTEM);
        notification.setIsRead(false);
        notification.setCreatedAt(now);

        NotificationResponse response = mapper.toResponse(notification);

        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getTitle()).isEqualTo("Titre");
        assertThat(response.getMessage()).isEqualTo("Message");
        assertThat(response.getType()).isEqualTo(NotificationType.SYSTEM);
        assertThat(response.getIsRead()).isFalse();
        assertThat(response.getCreatedAt()).isEqualTo(now);
    }
}
