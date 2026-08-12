package com.rentcar.rent_car.config;

import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.security.JwtUtils;
import com.rentcar.rent_car.service.UserConnectionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebSocketEventListenerTest {

    @Mock
    private UserConnectionService userConnectionService;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private WebSocketEventListener listener;

    @Test
    void shouldHandleConnectListener_whenTokenIsValid() {
        Map<String, Object> nativeHeaders = new HashMap<>();
        nativeHeaders.put("Authorization", List.of("Bearer valid-token"));

        Map<String, Object> headers = new HashMap<>();
        headers.put(SimpMessageHeaderAccessor.NATIVE_HEADERS, nativeHeaders);
        headers.put(SimpMessageHeaderAccessor.SESSION_ID_HEADER, "sess-123");

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], new org.springframework.messaging.MessageHeaders(headers));
        SessionConnectEvent event = new SessionConnectEvent(this, message);

        User user = new User();
        user.setId(1L);

        when(jwtUtils.validateToken("valid-token")).thenReturn(true);
        when(jwtUtils.getEmailFromToken("valid-token")).thenReturn("user@test.com");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

        listener.handleWebSocketConnectListener(event);

        verify(userConnectionService).userConnected(1L, "sess-123");
        verify(messagingTemplate).convertAndSend(eq("/topic/presence"), any(Object.class));
    }

    @Test
    void shouldHandleDisconnectListener() {
        Map<String, Object> headers = new HashMap<>();
        headers.put(SimpMessageHeaderAccessor.SESSION_ID_HEADER, "sess-123");

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], new org.springframework.messaging.MessageHeaders(headers));
        SessionDisconnectEvent event = new SessionDisconnectEvent(this, message, "sess-123", org.springframework.web.socket.CloseStatus.NORMAL);

        when(userConnectionService.userDisconnected("sess-123")).thenReturn(1L);
        when(userConnectionService.isUserOnline(1L)).thenReturn(false);

        listener.handleWebSocketDisconnectListener(event);

        verify(messagingTemplate).convertAndSend(eq("/topic/presence"), any(Object.class));
    }
}
