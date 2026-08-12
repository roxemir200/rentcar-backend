package com.rentcar.rent_car.entity;

import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.FuelType;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.enums.Transmission;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class EntityCoverageTest {

    @Test
    void testUserEntity() {
        User user = new User();
        user.setId(1L);
        user.setFirstName("Jean");
        user.setLastName("Dupont");
        user.setEmail("jean@test.com");
        user.setPassword("password");
        user.setPhoneNumber("0612345678");
        user.setAddress("Paris");
        user.setDrivingLicenseNumber("PERMIS123");
        user.setRole(Role.CLIENT);
        user.setIsActive(true);

        user.onCreate();
        user.onUpdate();

        assertThat(user.getId()).isEqualTo(1L);
        assertThat(user.getFirstName()).isEqualTo("Jean");
        assertThat(user.getLastName()).isEqualTo("Dupont");
        assertThat(user.getEmail()).isEqualTo("jean@test.com");
        assertThat(user.getPhoneNumber()).isEqualTo("0612345678");
        assertThat(user.getAddress()).isEqualTo("Paris");
        assertThat(user.getDrivingLicenseNumber()).isEqualTo("PERMIS123");
        assertThat(user.getRole()).isEqualTo(Role.CLIENT);
        assertThat(user.getIsActive()).isTrue();
        assertThat(user.getCreatedAt()).isNotNull();
        assertThat(user.getUpdatedAt()).isNotNull();
    }

    @Test
    void testCarEntity() {
        Car car = new Car();
        car.setId(10L);
        car.setBrand("BMW");
        car.setModel("X5");
        car.setYear(2023);
        car.setRegistrationNumber("AB-123-CD");
        car.setColor("Noir");
        car.setMileage(15000);
        car.setSeats(5);
        car.setFuelType(FuelType.DIESEL);
        car.setTransmission(Transmission.AUTOMATIC);
        car.setDailyRate(BigDecimal.valueOf(100.00));
        car.setStatus(CarStatus.AVAILABLE);
        car.setDescription("Superbe");

        car.onCreate();
        car.onUpdate();

        Review r1 = new Review();
        r1.setRating(5);
        Review r2 = new Review();
        r2.setRating(3);
        car.setReviews(List.of(r1, r2));

        assertThat(car.getAverageRating()).isEqualTo(4.0);
        assertThat(car.getReviewCount()).isEqualTo(2);
        assertThat(car.isAvailable()).isTrue();

        car.setReviews(List.of());
        assertThat(car.getAverageRating()).isNull();
        assertThat(car.getReviewCount()).isEqualTo(0);
    }

    @Test
    void testReservationEntity() {
        Reservation r = new Reservation();
        r.setId(100L);
        r.setStartDate(LocalDate.of(2026, 8, 1));
        r.setEndDate(LocalDate.of(2026, 8, 5));
        r.setPickupLocation("Paris");
        r.setReturnLocation("Lyon");
        r.setPricePerDaySnapshot(BigDecimal.valueOf(50.00));
        r.setTotalAmount(BigDecimal.valueOf(200.00));
        r.setStatus(ReservationStatus.CONFIRMED);
        r.setAdditionalNotes("Paiement effectué");
        r.setMileageStart(1000);
        r.setMileageEnd(1200);
        r.setFuelLevelStart("FULL");
        r.setFuelLevelEnd("HALF");
        r.setDamagesAtStart("Aucun");
        r.setDamagesAtEnd("Choc léger");

        r.onCreate();
        r.onUpdate();

        assertThat(r.getId()).isEqualTo(100L);
        assertThat(r.getStartDate()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(r.getEndDate()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(r.getPickupLocation()).isEqualTo("Paris");
        assertThat(r.getReturnLocation()).isEqualTo("Lyon");
        assertThat(r.getPricePerDaySnapshot()).isEqualTo(BigDecimal.valueOf(50.00));
        assertThat(r.getTotalAmount()).isEqualTo(BigDecimal.valueOf(200.00));
        assertThat(r.getStatus()).isEqualTo(ReservationStatus.CONFIRMED);
        assertThat(r.getMileageStart()).isEqualTo(1000);
        assertThat(r.getMileageEnd()).isEqualTo(1200);
        assertThat(r.getFuelLevelStart()).isEqualTo("FULL");
        assertThat(r.getFuelLevelEnd()).isEqualTo("HALF");
        assertThat(r.getDamagesAtStart()).isEqualTo("Aucun");
        assertThat(r.getDamagesAtEnd()).isEqualTo("Choc léger");
        assertThat(r.getCreatedAt()).isNotNull();
        assertThat(r.getUpdatedAt()).isNotNull();
    }

    @Test
    void testReviewEntity() {
        Review review = new Review();
        review.setId(5L);
        review.setRating(5);
        review.setComment("Parfait!");
        review.onCreate();

        assertThat(review.getId()).isEqualTo(5L);
        assertThat(review.getRating()).isEqualTo(5);
        assertThat(review.getComment()).isEqualTo("Parfait!");
        assertThat(review.getCreatedAt()).isNotNull();
    }

    @Test
    void testCarImageEntity() {
        CarImage img = new CarImage();
        img.setId(2L);
        img.setImageUrl("test.jpg");
        img.setIsPrimary(true);
        img.onCreate();

        assertThat(img.getId()).isEqualTo(2L);
        assertThat(img.getImageUrl()).isEqualTo("test.jpg");
        assertThat(img.getIsPrimary()).isTrue();
        assertThat(img.getCreatedAt()).isNotNull();
    }

    @Test
    void testNotificationEntity() {
        Notification n = new Notification();
        n.setId(3L);
        n.setTitle("Titre");
        n.setMessage("Message");
        n.setIsRead(false);
        n.onCreate();

        assertThat(n.getId()).isEqualTo(3L);
        assertThat(n.getTitle()).isEqualTo("Titre");
        assertThat(n.getMessage()).isEqualTo("Message");
        assertThat(n.getIsRead()).isFalse();
        assertThat(n.getCreatedAt()).isNotNull();
    }

    @Test
    void testPaymentEntity() {
        Payment p = new Payment();
        p.setId(4L);
        p.setExternalPaymentId("pi_123");
        p.setAmount(BigDecimal.valueOf(100.00));
        p.setCurrency("EUR");
        p.setProvider("STRIPE");
        p.setPaymentDate(LocalDateTime.now());
        p.onCreate();

        assertThat(p.getId()).isEqualTo(4L);
        assertThat(p.getExternalPaymentId()).isEqualTo("pi_123");
        assertThat(p.getAmount()).isEqualTo(BigDecimal.valueOf(100.00));
        assertThat(p.getCurrency()).isEqualTo("EUR");
        assertThat(p.getProvider()).isEqualTo("STRIPE");
        assertThat(p.getCreatedAt()).isNotNull();
    }

    @Test
    void testContractEntity() {
        Contract c = new Contract();
        c.setId(5L);
        c.setContractNumber("CTR-001");
        c.setTerms("Terms");
        c.setPdfUrl("/pdf");
        c.setSignedAt(LocalDateTime.now());
        c.onCreate();

        assertThat(c.getId()).isEqualTo(5L);
        assertThat(c.getContractNumber()).isEqualTo("CTR-001");
        assertThat(c.getTerms()).isEqualTo("Terms");
        assertThat(c.getPdfUrl()).isEqualTo("/pdf");
        assertThat(c.getCreatedAt()).isNotNull();
    }

    @Test
    void testChatMessageEntity() {
        ChatMessage cm = new ChatMessage();
        cm.setId(6L);
        cm.setMessage("Bonjour");
        cm.setTimestamp(LocalDateTime.now());
        cm.setIsRead(true);

        assertThat(cm.getId()).isEqualTo(6L);
        assertThat(cm.getMessage()).isEqualTo("Bonjour");
        assertThat(cm.getIsRead()).isTrue();
    }
}
