package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Récupérer tous les messages d'une conversation
    List<ChatMessage> findByConversationIdOrderByTimestampAsc(String conversationId);

    // Récupérer les messages non lus d'un utilisateur
    List<ChatMessage> findByReceiverIdAndIsReadFalse(Long receiverId);

    // Récupérer les messages non lus d'un utilisateur pour une conversation précise
    List<ChatMessage> findByReceiverIdAndConversationIdAndIsReadFalse(Long receiverId, String conversationId);

    // Compter les messages non lus
    Long countByReceiverIdAndIsReadFalse(Long receiverId);

    // Récupérer tous les messages d'un utilisateur (soit en tant qu'expéditeur, soit en tant que destinataire)
    List<ChatMessage> findBySenderIdOrReceiverIdOrderByTimestampAsc(Long senderId, Long receiverId);
}
