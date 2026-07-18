package com.rentcar.rent_car.service.impl;

import com.rentcar.rent_car.dto.mapper.NotificationMapper;
import com.rentcar.rent_car.dto.response.NotificationResponse;
import com.rentcar.rent_car.entity.Notification;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.NotificationType;
import com.rentcar.rent_car.repository.NotificationRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.service.SseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class SseServiceImpl implements SseService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationMapper notificationMapper;

    /**
     * Stocke toutes les connexions SSE actives
     * Clé = userId, Valeur = SseEmitter
     */
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    @Override
    public SseEmitter subscribe(Long userId) {
        // Créer un SseEmitter avec un timeout de 30 minutes
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);

        // Stocker l'emitter
        emitters.put(userId, emitter);

        // Envoyer un événement de connexion
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("Connecté au flux de notifications"));
        } catch (IOException e) {
            log.error("Erreur lors de l'envoi de l'événement de connexion", e);
        }

        // Nettoyer quand la connexion est terminée
        emitter.onCompletion(() -> {
            log.info("SSE déconnecté pour userId: {}", userId);
            emitters.remove(userId);
        });

        emitter.onTimeout(() -> {
            log.info("SSE timeout pour userId: {}", userId);
            emitters.remove(userId);
        });

        emitter.onError(throwable -> {
            log.error("SSE erreur pour userId: {}", userId, throwable);
            emitters.remove(userId);
        });

        return emitter;
    }

    @Override
    public void sendNotification(Long userId, NotificationResponse notification) {
        SseEmitter emitter = emitters.get(userId);

        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(notification));
            } catch (IOException e) {
                log.error("Erreur lors de l'envoi de la notification à userId: {}", userId, e);
                emitters.remove(userId);
            }
        }
    }

    @Override
    public void createAndSend(Long userId, String title, String message, String type) {
        User recipient = userRepository.findById(userId)
                .orElse(null);

        if (recipient == null) {
            return;
        }

        // Sauvegarder en base
        Notification notification = new Notification();
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(NotificationType.valueOf(type));
        notification.setIsRead(false);
        notification.setRecipient(recipient);
        notificationRepository.save(notification);

        // Envoyer en temps réel via SSE
        NotificationResponse response = notificationMapper.toResponse(notification);
        sendNotification(userId, response);
    }
}