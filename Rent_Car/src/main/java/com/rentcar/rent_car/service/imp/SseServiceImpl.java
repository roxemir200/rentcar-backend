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
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
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

    /**
     * Envoyer des événements "ping" toutes les 30 secondes pour garder la connexion alive
     */
    @Scheduled(fixedRate = 30000) // 30 secondes
    public void sendPing() {
        emitters.forEach((userId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .name("ping")
                        .data("keep-alive"));
            } catch (Exception e) {
                log.debug("Ping SSE échoué pour userId: {} (client déconnecté). Nettoyage.", userId);
                emitters.remove(userId);
                // Ne JAMAIS appeler completeWithError ici :
                // - le client est déjà parti (navigateur fermé, onglet fermé, réseau coupé)
                // - ça force un AsyncDispatch qui repasse Spring Security et produit des ERROR logs
                // On préfère simplement "oublier" l'emitter et laisser Tomcat GC la requête.
            }
        });
    }

    @Override
    public SseEmitter subscribe(Long userId) {
        // Créer un SseEmitter avec un timeout de 2 heures
        SseEmitter emitter = new SseEmitter(2 * 60 * 60 * 1000L);

        // Stocker l'emitter
        emitters.put(userId, emitter);

        // Envoyer un événement de connexion
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("Connecté au flux de notifications"));
        } catch (IOException e) {
            log.error("Erreur lors de l'envoi de l'événement de connexion", e);
            emitters.remove(userId);
            emitter.completeWithError(e);
            return emitter;
        }

        // Nettoyer quand la connexion est terminée
        emitter.onCompletion(() -> {
            log.info("SSE déconnecté pour userId: {}", userId);
            emitters.remove(userId);
        });

        emitter.onTimeout(() -> {
            log.info("SSE timeout pour userId: {}", userId);
            emitters.remove(userId);
            emitter.complete(); // Complete gracefully instead of letting it throw
        });

        emitter.onError(throwable -> {
            log.debug("SSE erreur pour userId: {} (probablement déconnexion). Nettoyage.", userId);
            emitters.remove(userId);
            // ⚠️ Ne PAS appeler emitter.completeWithError(throwable) ici :
            // onError est déjà le résultat d'une erreur d'écriture, le socket est mort.
            // Rappeler completeWithError déclencherait un dispatch ASYNC supplémentaire
            // qui repasserait dans Spring Security et produirait "AuthorizationDeniedException /
            // response already committed".
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
            } catch (Exception e) {
                log.debug("Erreur lors de l'envoi de la notification à userId: {} (probablement déconnexion)", userId);
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

    @Override
    public void sendEvent(Long userId, String eventName, Object data) {
        SseEmitter emitter = emitters.get(userId);

        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data));
            } catch (Exception e) {
                log.debug("Erreur lors de l'envoi de l'événement {} à userId: {} (probablement déconnexion)", eventName, userId);
                emitters.remove(userId);
            }
        }
    }

    @Override
    public void sendEventToAllAdmins(String eventName, Object data) {
        List<User> admins = userRepository.findByRole(com.rentcar.rent_car.enums.Role.ADMIN);
        for (User admin : admins) {
            sendEvent(admin.getId(), eventName, data);
        }
    }
}
