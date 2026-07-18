package com.rentcar.rent_car.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "car_images")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CarImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String imageUrl;

    private Boolean isPrimary = false;

    private LocalDateTime createdAt;
    @ManyToOne
    @JoinColumn(name = "car_id")
    private Car car;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}