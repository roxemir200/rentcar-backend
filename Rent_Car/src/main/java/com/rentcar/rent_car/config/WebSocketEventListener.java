package com.rentcar.rent_car.config;

import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.security.JwtUtils;
import com.rentcar.rent_car.service.UserConnectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {
    private final UserConnectionService userConnectionService;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        String sessionId = accessor.getSessionId();

        if (sessionId != null && authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtils.validateToken(token)) {
                String email = jwtUtils.getEmailFromToken(token);
                Optional<User> userOptional = userRepository.findByEmail(email);

                if (userOptional.isPresent()) {
                    Long userId = userOptional.get().getId();
                    userConnectionService.userConnected(userId, sessionId);
                    Map<String, Object> payload = Map.of("userId", userId, "online", true);
                    messagingTemplate.convertAndSend("/topic/presence", (Object) payload);
                    log.info("User {} connected (online now)", userId);
                }
            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        if (sessionId == null) {
            return;
        }

        Long userId = userConnectionService.userDisconnected(sessionId);
        if (userId != null) {
            boolean stillOnline = userConnectionService.isUserOnline(userId);
            Map<String, Object> payload = Map.of("userId", userId, "online", stillOnline);
            messagingTemplate.convertAndSend("/topic/presence", (Object) payload);
            log.info("User {} disconnected (online={})", userId, stillOnline);
        }
    }
}
