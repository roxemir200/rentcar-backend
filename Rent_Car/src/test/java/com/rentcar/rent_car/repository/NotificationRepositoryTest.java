package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Notification;
import com.rentcar.rent_car.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationRepositoryTest {

    @Mock
    private NotificationRepository notificationRepository;

    private User recipient;
    private Notification notif1;

    @BeforeEach
    void setUp() {
        recipient = new User();
        recipient.setId(1L);

        notif1 = new Notification();
        notif1.setId(10L);
        notif1.setRecipient(recipient);
        notif1.setTitle("Notif 1");
        notif1.setMessage("Message 1");
        notif1.setIsRead(false);
        notif1.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void shouldFindByRecipientIdOrderByCreatedAtDesc() {
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(notif1));

        List<Notification> notifs = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(1L);

        assertThat(notifs).hasSize(1);
        assertThat(notifs.get(0).getTitle()).isEqualTo("Notif 1");
    }

    @Test
    void shouldFindByRecipientIdAndIsReadFalseOrderByCreatedAtDesc() {
        when(notificationRepository.findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(1L)).thenReturn(List.of(notif1));

        List<Notification> unreadNotifs = notificationRepository
                .findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(1L);

        assertThat(unreadNotifs).hasSize(1);
    }

    @Test
    void shouldCountByRecipientIdAndIsReadFalse() {
        when(notificationRepository.countByRecipientIdAndIsReadFalse(1L)).thenReturn(1L);

        Long count = notificationRepository.countByRecipientIdAndIsReadFalse(1L);

        assertThat(count).isEqualTo(1L);
    }
}
