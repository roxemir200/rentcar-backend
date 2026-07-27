package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.response.NotificationResponse;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

public interface SseService {

    /**
     * Abonner un utilisateur au flux SSE
     */
    SseEmitter subscribe(Long userId);

    /**
     * Envoyer une notification à un utilisateur spécifique
     */
    void sendNotification(Long userId, NotificationResponse notification);

    /**
     * Créer et envoyer une notification
     */
    void createAndSend(Long userId, String title, String message, String type);

    /**
     * Envoyer un événement personnalisé
     */
    void sendEvent(Long userId, String eventName, Object data);

    /**
     * Envoyer un événement à TOUS les administrateurs connectés.
     */
    void sendEventToAllAdmins(String eventName, Object data);
}