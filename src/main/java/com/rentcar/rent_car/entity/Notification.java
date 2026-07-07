package com.rentcar.rent_car.entity;

import com.rentcar.rent_car.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    private Boolean isRead = false;

    private LocalDateTime createdAt;
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User recipient;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}