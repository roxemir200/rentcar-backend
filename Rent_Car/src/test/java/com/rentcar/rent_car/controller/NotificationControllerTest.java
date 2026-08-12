package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.mapper.NotificationMapper;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.NotificationResponse;
import com.rentcar.rent_car.entity.Notification;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.repository.NotificationRepository;
import com.rentcar.rent_car.security.JwtUtils;
import com.rentcar.rent_car.security.UserDetailsImpl;
import com.rentcar.rent_car.security.UserDetailsServiceImpl;
import com.rentcar.rent_car.service.SseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {

    @Mock
    private SseService sseService;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationMapper notificationMapper;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private UserDetailsServiceImpl userDetailsService;

    @InjectMocks
    private NotificationController notificationController;

    private UserDetailsImpl userDetails;
    private User user;
    private Notification notification;

    @BeforeEach
    void setUp() {
        userDetails = new UserDetailsImpl(1L, "user@test.com", "pass", null, true);
        user = new User();
        user.setId(1L);

        notification = new Notification();
        notification.setId(10L);
        notification.setRecipient(user);
        notification.setIsRead(false);
    }

    @Test
    void shouldStreamNotifications_withUserDetails() {
        SseEmitter emitter = new SseEmitter();
        when(sseService.subscribe(1L)).thenReturn(emitter);

        SseEmitter result = notificationController.streamNotifications(userDetails, null);

        assertThat(result).isNotNull();
    }

    @Test
    void shouldStreamNotifications_withToken() {
        SseEmitter emitter = new SseEmitter();
        when(jwtUtils.validateToken("valid-token")).thenReturn(true);
        when(jwtUtils.getEmailFromToken("valid-token")).thenReturn("user@test.com");
        when(userDetailsService.loadUserByUsername("user@test.com")).thenReturn(userDetails);
        when(sseService.subscribe(1L)).thenReturn(emitter);

        SseEmitter result = notificationController.streamNotifications(null, "valid-token");

        assertThat(result).isNotNull();
    }

    @Test
    void shouldThrow_whenStreamNotificationsUnauthenticated() {
        assertThatThrownBy(() -> notificationController.streamNotifications(null, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Non authentifié");
    }

    @Test
    void shouldGetMyNotifications() {
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(notification));
        when(notificationMapper.toResponse(notification)).thenReturn(new NotificationResponse());

        ResponseEntity<List<NotificationResponse>> response = notificationController.getMyNotifications(userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldGetUnreadNotifications() {
        when(notificationRepository.findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(notification));
        when(notificationMapper.toResponse(notification)).thenReturn(new NotificationResponse());

        ResponseEntity<List<NotificationResponse>> response = notificationController.getUnreadNotifications(userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldGetUnreadCount() {
        when(notificationRepository.countByRecipientIdAndIsReadFalse(1L)).thenReturn(3L);

        ResponseEntity<Long> response = notificationController.getUnreadCount(userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(3L);
    }

    @Test
    void shouldMarkAsRead_whenSuccess() {
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(notification));

        ResponseEntity<MessageResponse> response = notificationController.markAsRead(10L, userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(notification.getIsRead()).isTrue();
        verify(notificationRepository).save(notification);
    }

    @Test
    void shouldMarkAsRead_whenUnauthorizedUser() {
        User recipient = new User();
        recipient.setId(99L);
        notification.setRecipient(recipient);
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(notification));

        ResponseEntity<MessageResponse> response = notificationController.markAsRead(10L, userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getMessage()).contains("Non autorisé");
    }

    @Test
    void shouldMarkAllAsRead() {
        when(notificationRepository.findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(notification));

        ResponseEntity<MessageResponse> response = notificationController.markAllAsRead(userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(notification.getIsRead()).isTrue();
        verify(notificationRepository).saveAll(anyList());
    }

    @Test
    void shouldDeleteNotification_whenSuccess() {
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(notification));

        ResponseEntity<MessageResponse> response = notificationController.deleteNotification(10L, userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(notificationRepository).delete(notification);
    }

    @Test
    void shouldDeleteNotification_whenUnauthorizedUser() {
        User recipient = new User();
        recipient.setId(99L);
        notification.setRecipient(recipient);
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(notification));

        ResponseEntity<MessageResponse> response = notificationController.deleteNotification(10L, userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
