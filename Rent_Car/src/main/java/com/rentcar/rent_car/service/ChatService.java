package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.response.ConversationResponse;
import com.rentcar.rent_car.entity.ChatMessage;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.repository.ChatMessageRepository;
import com.rentcar.rent_car.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final SseService sseService;
    private final FaqService faqService;
    private final UserConnectionService userConnectionService;

    // Envoyer un message (sauvegarde + notification temps réel)
    public ChatMessage sendMessage(ChatMessage message) {
        message.setTimestamp(LocalDateTime.now());
        message.setIsRead(false);
        ChatMessage savedUserMessage = chatMessageRepository.save(message);

        // Envoyer le message de l'utilisateur au destinataire (si c'est admin, ou autre)
        messagingTemplate.convertAndSend("/topic/messages/" + savedUserMessage.getReceiverId(), savedUserMessage);

        // Vérifier si on a une réponse FAQ (seulement si le message vient d'un client, pas de l'admin)
        Optional<String> faqAnswer = faqService.getAnswer(savedUserMessage.getMessage());
        if (faqAnswer.isPresent()) {
            // Créer et envoyer la réponse du chatbot
            ChatMessage chatbotMessage = new ChatMessage();
            chatbotMessage.setSenderId(savedUserMessage.getReceiverId()); // Chatbot "envoie" depuis le support/admin
            chatbotMessage.setReceiverId(savedUserMessage.getSenderId()); // À l'utilisateur
            chatbotMessage.setMessage(faqAnswer.get());
            chatbotMessage.setConversationId(savedUserMessage.getConversationId());
            chatbotMessage.setTimestamp(LocalDateTime.now());
            chatbotMessage.setIsRead(false);

            ChatMessage savedChatbotMessage = chatMessageRepository.save(chatbotMessage);
            // Envoyer la réponse chatbot à l'utilisateur
            messagingTemplate.convertAndSend("/topic/messages/" + savedChatbotMessage.getReceiverId(), savedChatbotMessage);

            // Ne PAS envoyer de notification SSE à l'admin pour les messages réponse FAQ
            return savedUserMessage;
        }

        // Si pas de FAQ, continuer avec la logique originale (notifier l'admin)
        User sender = userRepository.findById(savedUserMessage.getSenderId()).orElse(null);
        User recipient = userRepository.findById(savedUserMessage.getReceiverId()).orElse(null);
        
        if (sender != null && recipient != null) {
            try {
                sseService.createAndSend(
                        recipient.getId(),
                        "Nouveau message",
                        String.format(
                                "%s %s vous a envoyé un message",
                                sender.getFirstName(),
                                sender.getLastName()
                        ),
                        "CHAT"
                );
            } catch (Exception exception) {
                log.error("Impossible d'envoyer la notification temps reel pour le message {}", savedUserMessage.getId(), exception);
            }
        }

        return savedUserMessage;
    }

    // Récupérer l'historique d'une conversation
    public List<ChatMessage> getHistory(Long userId, String conversationId) {
        return chatMessageRepository
                .findByConversationIdOrderByTimestampAsc(conversationId)
                .stream()
                .filter(message -> message.getSenderId().equals(userId) || message.getReceiverId().equals(userId))
                .toList();
    }

    // Marquer les messages comme lus
    public void markAsRead(Long userId, String conversationId) {
        List<ChatMessage> unread = chatMessageRepository
                .findByReceiverIdAndConversationIdAndIsReadFalse(userId, conversationId);
        unread.forEach(msg -> msg.setIsRead(true));
        chatMessageRepository.saveAll(unread);
    }

    // Compter les messages non lus
    public Long getUnreadCount(Long userId) {
        return chatMessageRepository.countByReceiverIdAndIsReadFalse(userId);
    }

    // Récupérer toutes les conversations d'un utilisateur
    public List<ConversationResponse> getConversations(Long userId) {
        // Fetch all relevant messages in 1 query (optimisé !)
        List<ChatMessage> userMessages = chatMessageRepository.findBySenderIdOrReceiverIdOrderByTimestampAsc(userId, userId);

        if (userMessages.isEmpty()) {
            return new ArrayList<>();
        }

        // Group messages by conversation
        Map<String, List<ChatMessage>> groupedMessages = userMessages.stream()
                .collect(Collectors.groupingBy(ChatMessage::getConversationId));

        // Collect all unique user IDs we need to fetch
        Set<Long> userIdsToFetch = new HashSet<>();
        for (List<ChatMessage> msgs : groupedMessages.values()) {
            ChatMessage lastMsg = msgs.stream()
                    .max(Comparator.comparing(ChatMessage::getTimestamp))
                    .orElse(null);
            if (lastMsg != null) {
                Long otherUserId = lastMsg.getSenderId().equals(userId)
                        ? lastMsg.getReceiverId()
                        : lastMsg.getSenderId();
                userIdsToFetch.add(otherUserId);
            }
        }

        // Fetch all users in 1 query (avoid N+1)
        Map<Long, User> userMap = userRepository.findAllById(userIdsToFetch).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        // Build conversation responses
        return groupedMessages.entrySet().stream()
                .map(entry -> {
                    List<ChatMessage> messages = entry.getValue();
                    ChatMessage lastMsg = messages.stream()
                            .max(Comparator.comparing(ChatMessage::getTimestamp))
                            .orElse(null);

                    if (lastMsg == null) return null;

                    Long otherUserId = lastMsg.getSenderId().equals(userId)
                            ? lastMsg.getReceiverId()
                            : lastMsg.getSenderId();

                    User otherUser = userMap.get(otherUserId);
                    if (otherUser == null) return null;

                    long unreadCount = messages.stream()
                            .filter(msg -> msg.getReceiverId().equals(userId) && !msg.getIsRead())
                            .count();

                    return new ConversationResponse(
                            otherUserId,
                            otherUser.getFirstName() + " " + otherUser.getLastName(),
                            otherUser.getEmail(),
                            lastMsg.getMessage(),
                            lastMsg.getTimestamp(),
                            unreadCount,
                            userConnectionService.isUserOnline(otherUserId)
                    );
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(ConversationResponse::getLastMessageTime).reversed())
                .collect(Collectors.toList());
    }
}
