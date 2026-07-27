package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.NotificationResponse;
import com.rentcar.rent_car.security.JwtUtils;
import com.rentcar.rent_car.security.UserDetailsImpl;
import com.rentcar.rent_car.security.UserDetailsServiceImpl;
import com.rentcar.rent_car.service.SseService;
import com.rentcar.rent_car.repository.NotificationRepository;
import com.rentcar.rent_car.dto.mapper.NotificationMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final SseService sseService;
    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final JwtUtils jwtUtils;
    private final UserDetailsServiceImpl userDetailsService;

    /**
     * Flux SSE - Connexion persistante pour recevoir les notifications en temps réel
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamNotifications(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                           @RequestParam(value = "token", required = false) String token) {
        Long userId;
        
        if (userDetails != null) {
            userId = userDetails.getId();
        } else if (StringUtils.hasText(token) && jwtUtils.validateToken(token)) {
            String email = jwtUtils.getEmailFromToken(token);
            UserDetailsImpl userFromToken = (UserDetailsImpl) userDetailsService.loadUserByUsername(email);
            userId = userFromToken.getId();
        } else {
            throw new RuntimeException("Non authentifié");
        }
        
        return sseService.subscribe(userId);
    }

    /**
     * Récupérer toutes mes notifications (historique)
     */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(
                notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userDetails.getId())
                        .stream()
                        .map(notificationMapper::toResponse)
                        .collect(Collectors.toList()));
    }

    /**
     * Récupérer uniquement les notifications non lues
     */
    @GetMapping("/unread")
    public ResponseEntity<List<NotificationResponse>> getUnreadNotifications(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(
                notificationRepository.findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(userDetails.getId())
                        .stream()
                        .map(notificationMapper::toResponse)
                        .collect(Collectors.toList()));
    }

    /**
     * Nombre de notifications non lues (badge)
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(
                notificationRepository.countByRecipientIdAndIsReadFalse(userDetails.getId()));
    }

    /**
     * Marquer une notification comme lue
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<MessageResponse> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        var notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification non trouvée"));

        if (!notification.getRecipient().getId().equals(userDetails.getId())) {
            return ResponseEntity.badRequest()
                    .body(MessageResponse.error("Non autorisé"));
        }

        notification.setIsRead(true);
        notificationRepository.save(notification);

        return ResponseEntity.ok(MessageResponse.success("Marquée comme lue"));
    }

    /**
     * Marquer toutes les notifications comme lues
     */
    @PutMapping("/read-all")
    public ResponseEntity<MessageResponse> markAllAsRead(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        var unread = notificationRepository
                .findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(userDetails.getId());

        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);

        return ResponseEntity.ok(MessageResponse.success(unread.size() + " notification(s) lue(s)"));
    }

    /**
     * Supprimer une notification
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteNotification(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        var notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification non trouvée"));

        if (!notification.getRecipient().getId().equals(userDetails.getId())) {
            return ResponseEntity.badRequest()
                    .body(MessageResponse.error("Non autorisé"));
        }

        notificationRepository.delete(notification);

        return ResponseEntity.ok(MessageResponse.success("Notification supprimée"));
    }
}