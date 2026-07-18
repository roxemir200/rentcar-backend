package com.rentcar.rent_car.entity;

import com.rentcar.rent_car.enums.ReservationStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    private String pickupLocation;

    private String returnLocation;

    private BigDecimal pricePerDaySnapshot;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    private ReservationStatus status = ReservationStatus.PENDING;

    @Column(length = 500)
    private String additionalNotes;

    private Integer mileageStart;

    private Integer mileageEnd;

    private String fuelLevelStart;

    private String fuelLevelEnd;

    // ========== CHANGÉ : Deux champs au lieu d'un ==========
    @Column(length = 500)
    private String damagesAtStart;   // Dégâts existants au début

    @Column(length = 500)
    private String damagesAtEnd;     // Nouveaux dégâts constatés au retour

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @ManyToOne
    @JoinColumn(name = "client_id")
    private User client;

    @ManyToOne
    @JoinColumn(name = "car_id")
    private Car car;

    @OneToOne(mappedBy = "reservation")
    private Payment payment;

    @OneToOne(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    private Contract contract;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}