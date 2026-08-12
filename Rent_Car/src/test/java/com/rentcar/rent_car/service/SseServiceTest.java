package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.mapper.NotificationMapper;
import com.rentcar.rent_car.dto.response.NotificationResponse;
import com.rentcar.rent_car.entity.Notification;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.NotificationRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.service.imp.SseServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SseServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationMapper notificationMapper;

    @InjectMocks
    private SseServiceImpl sseService;

    private User user;
    private User admin;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setEmail("user@test.com");

        admin = new User();
        admin.setId(2L);
        admin.setRole(Role.ADMIN);
    }

    @Test
    void shouldSubscribeUserAndReturnEmitter() {
        SseEmitter emitter = sseService.subscribe(1L);

        assertThat(emitter).isNotNull();
    }

    @Test
    void shouldSendPingToConnectedEmitters() {
        sseService.subscribe(1L);
        sseService.sendPing();
    }

    @Test
    void shouldCreateAndSendNotification() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));
        when(notificationMapper.toResponse(any(Notification.class))).thenReturn(new NotificationResponse());

        sseService.subscribe(1L);
        sseService.createAndSend(1L, "Titre", "Message de test", "RESERVATION");

        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    void shouldNotCreateAndSendNotification_whenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        sseService.createAndSend(99L, "Titre", "Message", "RESERVATION");

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void shouldSendEventToAllAdmins() {
        when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(admin));

        sseService.subscribe(2L);
        sseService.sendEventToAllAdmins("test.event", "Data");
    }
}
