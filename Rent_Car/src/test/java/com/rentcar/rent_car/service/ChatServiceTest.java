package com.rentcar.rent_car.service;

import com.rentcar.rent_car.entity.ChatMessage;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.repository.ChatMessageRepository;
import com.rentcar.rent_car.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SseService sseService;

    @Mock
    private FaqService faqService;

    @Mock
    private UserConnectionService userConnectionService;

    @InjectMocks
    private ChatService chatService;

    private ChatMessage message;
    private User sender;
    private User recipient;

    @BeforeEach
    void setUp() {
        sender = new User();
        sender.setId(1L);
        sender.setFirstName("Alice");
        sender.setLastName("Durand");

        recipient = new User();
        recipient.setId(2L);
        recipient.setFirstName("Bob");
        recipient.setLastName("Admin");

        message = new ChatMessage();
        message.setId(10L);
        message.setSenderId(1L);
        message.setReceiverId(2L);
        message.setConversationId("conv-1-2");
        message.setMessage("Bonjour, je souhaite réserver.");
    }

    @Test
    void shouldSendMessage_whenFaqMatches() {
        when(chatMessageRepository.save(any(ChatMessage.class))).thenAnswer(i -> i.getArgument(0));
        when(faqService.getAnswer("Bonjour, je souhaite réserver."))
                .thenReturn(Optional.of("Pour réserver, visitez notre catalogue."));

        ChatMessage result = chatService.sendMessage(message);

        assertThat(result).isNotNull();
        verify(messagingTemplate, times(2)).convertAndSend(anyString(), any(ChatMessage.class));
    }

    @Test
    void shouldSendMessage_whenNoFaqMatchesAndSendSseNotification() {
        when(chatMessageRepository.save(any(ChatMessage.class))).thenAnswer(i -> i.getArgument(0));
        when(faqService.getAnswer(anyString())).thenReturn(Optional.empty());
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(userRepository.findById(2L)).thenReturn(Optional.of(recipient));

        ChatMessage result = chatService.sendMessage(message);

        assertThat(result).isNotNull();
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/messages/2"), eq(message));
        verify(sseService).createAndSend(eq(2L), eq("Nouveau message"), anyString(), eq("CHAT"));
    }

    @Test
    void shouldGetHistory() {
        when(chatMessageRepository.findByConversationIdOrderByTimestampAsc("conv-1-2"))
                .thenReturn(List.of(message));

        List<ChatMessage> history = chatService.getHistory(1L, "conv-1-2");

        assertThat(history).hasSize(1);
    }

    @Test
    void shouldFilterHistory_whenUserNotInMessage() {
        when(chatMessageRepository.findByConversationIdOrderByTimestampAsc("conv-1-2"))
                .thenReturn(List.of(message));

        List<ChatMessage> history = chatService.getHistory(99L, "conv-1-2");

        assertThat(history).isEmpty();
    }

    @Test
    void shouldMarkAsRead() {
        message.setIsRead(false);
        when(chatMessageRepository.findByReceiverIdAndConversationIdAndIsReadFalse(2L, "conv-1-2"))
                .thenReturn(List.of(message));

        chatService.markAsRead(2L, "conv-1-2");

        assertThat(message.getIsRead()).isTrue();
        verify(chatMessageRepository).saveAll(anyList());
    }
}
