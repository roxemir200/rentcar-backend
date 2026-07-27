package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.ConversationResponse;
import com.rentcar.rent_car.entity.ChatMessage;
import com.rentcar.rent_car.service.ChatService;
import com.rentcar.rent_car.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // Endpoint WebSocket pour envoyer un message en temps réel
    // Client → /app/chat.send
    @MessageMapping("/chat.send")
    public void sendMessage(ChatMessage message) {
        chatService.sendMessage(message);
    }

    // Récupérer l'historique d'une conversation
    @GetMapping("/history/{conversationId}")
    public ResponseEntity<List<ChatMessage>> getHistory(
            @PathVariable String conversationId,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(chatService.getHistory(user.getId(), conversationId));
    }

    // Marquer les messages comme lus
    @PutMapping("/read/{conversationId}")
    public ResponseEntity<Void> markAsRead(
            @PathVariable String conversationId,
            @AuthenticationPrincipal UserDetailsImpl user) {
        chatService.markAsRead(user.getId(), conversationId);
        return ResponseEntity.ok().build();
    }

    // Compter les messages non lus
    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(chatService.getUnreadCount(user.getId()));
    }

    // Récupérer toutes les conversations de l'utilisateur
    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationResponse>> getConversations(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(chatService.getConversations(user.getId()));
    }
}
