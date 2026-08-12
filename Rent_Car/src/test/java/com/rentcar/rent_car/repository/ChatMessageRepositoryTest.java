package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.ChatMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatMessageRepositoryTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;

    private ChatMessage msg;

    @BeforeEach
    void setUp() {
        msg = new ChatMessage();
        msg.setId(1L);
        msg.setMessage("Bonjour support");
        msg.setConversationId("conv-123");
        msg.setIsRead(false);
    }

    @Test
    void shouldFindByConversationIdOrderByTimestampAsc() {
        when(chatMessageRepository.findByConversationIdOrderByTimestampAsc("conv-123")).thenReturn(List.of(msg));

        List<ChatMessage> list = chatMessageRepository.findByConversationIdOrderByTimestampAsc("conv-123");

        assertThat(list).hasSize(1);
    }

    @Test
    void shouldFindByReceiverIdAndIsReadFalse() {
        when(chatMessageRepository.findByReceiverIdAndIsReadFalse(2L)).thenReturn(List.of(msg));

        List<ChatMessage> unread = chatMessageRepository.findByReceiverIdAndIsReadFalse(2L);

        assertThat(unread).hasSize(1);
    }

    @Test
    void shouldFindByReceiverIdAndConversationIdAndIsReadFalse() {
        when(chatMessageRepository.findByReceiverIdAndConversationIdAndIsReadFalse(2L, "conv-123"))
                .thenReturn(List.of(msg));

        List<ChatMessage> unread = chatMessageRepository
                .findByReceiverIdAndConversationIdAndIsReadFalse(2L, "conv-123");

        assertThat(unread).hasSize(1);
    }

    @Test
    void shouldCountByReceiverIdAndIsReadFalse() {
        when(chatMessageRepository.countByReceiverIdAndIsReadFalse(2L)).thenReturn(1L);

        Long count = chatMessageRepository.countByReceiverIdAndIsReadFalse(2L);

        assertThat(count).isEqualTo(1L);
    }

    @Test
    void shouldFindBySenderIdOrReceiverIdOrderByTimestampAsc() {
        when(chatMessageRepository.findBySenderIdOrReceiverIdOrderByTimestampAsc(1L, 1L))
                .thenReturn(List.of(msg));

        List<ChatMessage> list = chatMessageRepository
                .findBySenderIdOrReceiverIdOrderByTimestampAsc(1L, 1L);

        assertThat(list).hasSize(1);
    }
}
