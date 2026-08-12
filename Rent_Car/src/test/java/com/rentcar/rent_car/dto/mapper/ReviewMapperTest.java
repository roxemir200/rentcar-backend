package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.ReviewRequest;
import com.rentcar.rent_car.dto.response.ReviewResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.Review;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewMapperTest {

    @Mock
    private ReservationRepository reservationRepository;

    @InjectMocks
    private ReviewMapper reviewMapper;

    private Reservation reservation;

    @BeforeEach
    void setUp() {
        User client = new User();
        client.setId(1L);
        client.setFirstName("Jean");
        client.setLastName("Dupont");

        Car car = new Car();
        car.setId(10L);
        car.setBrand("BMW");
        car.setModel("X5");

        reservation = new Reservation();
        reservation.setId(100L);
        reservation.setClient(client);
        reservation.setCar(car);
    }

    @Test
    void shouldToEntity_whenReservationExists() {
        ReviewRequest request = new ReviewRequest();
        request.setReservationId(100L);
        request.setRating(5);
        request.setComment("Parfait!");

        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));

        Review review = reviewMapper.toEntity(request);

        assertThat(review.getRating()).isEqualTo(5);
        assertThat(review.getComment()).isEqualTo("Parfait!");
        assertThat(review.getReservation()).isEqualTo(reservation);
        assertThat(review.getClient().getId()).isEqualTo(1L);
        assertThat(review.getCar().getId()).isEqualTo(10L);
    }

    @Test
    void shouldThrow_whenReservationNotFoundInToEntity() {
        ReviewRequest request = new ReviewRequest();
        request.setReservationId(100L);

        when(reservationRepository.findById(100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reviewMapper.toEntity(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Réservation non trouvée");
    }

    @Test
    void shouldToResponse_withFullDetails() {
        LocalDateTime now = LocalDateTime.now();
        Review review = new Review();
        review.setId(5L);
        review.setRating(5);
        review.setComment("Parfait!");
        review.setClient(reservation.getClient());
        review.setCar(reservation.getCar());
        review.setReservation(reservation);
        review.setCreatedAt(now);

        ReviewResponse response = reviewMapper.toResponse(review);

        assertThat(response.getId()).isEqualTo(5L);
        assertThat(response.getRating()).isEqualTo(5);
        assertThat(response.getClientFirstName()).isEqualTo("Jean");
        assertThat(response.getCarBrand()).isEqualTo("BMW");
        assertThat(response.getReservationId()).isEqualTo(100L);
    }

    @Test
    void shouldToResponse_withNullClientAndNullCarAndNullReservation() {
        Review review = new Review();
        review.setId(6L);

        ReviewResponse response = reviewMapper.toResponse(review);

        assertThat(response.getId()).isEqualTo(6L);
        assertThat(response.getClientFirstName()).isNull();
        assertThat(response.getClientLastName()).isNull();
        assertThat(response.getClientId()).isNull();
        assertThat(response.getCarBrand()).isNull();
        assertThat(response.getCarModel()).isNull();
        assertThat(response.getCarId()).isNull();
        assertThat(response.getReservationId()).isNull();
    }
}
