package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.ConversationResponse;
import com.rentcar.rent_car.entity.ChatMessage;
import com.rentcar.rent_car.security.UserDetailsImpl;
import com.rentcar.rent_car.service.ChatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock
    private ChatService chatService;

    @InjectMocks
    private ChatController chatController;

    private UserDetailsImpl userDetails;

    @BeforeEach
    void setUp() {
        userDetails = new UserDetailsImpl(1L, "user@test.com", "pass", null, true);
    }

    @Test
    void shouldSendMessageWebSocket() {
        ChatMessage message = new ChatMessage();
        chatController.sendMessage(message);

        verify(chatService).sendMessage(message);
    }

    @Test
    void shouldGetHistory() {
        when(chatService.getHistory(1L, "conv-123")).thenReturn(List.of(new ChatMessage()));

        ResponseEntity<List<ChatMessage>> response = chatController.getHistory("conv-123", userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldMarkAsRead() {
        ResponseEntity<Void> response = chatController.markAsRead("conv-123", userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(chatService).markAsRead(1L, "conv-123");
    }

    @Test
    void shouldGetUnreadCount() {
        when(chatService.getUnreadCount(1L)).thenReturn(4L);

        ResponseEntity<Long> response = chatController.getUnreadCount(userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(4L);
    }

    @Test
    void shouldGetConversations() {
        when(chatService.getConversations(1L)).thenReturn(List.of(new ConversationResponse()));

        ResponseEntity<List<ConversationResponse>> response = chatController.getConversations(userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }
}
