package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Review;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewRepositoryTest {

    @Mock
    private ReviewRepository reviewRepository;

    private Review review;

    @BeforeEach
    void setUp() {
        review = new Review();
        review.setId(5L);
        review.setRating(5);
        review.setComment("Super voiture!");
    }

    @Test
    void shouldFindByCarId() {
        when(reviewRepository.findByCarId(10L)).thenReturn(List.of(review));

        List<Review> list = reviewRepository.findByCarId(10L);

        assertThat(list).hasSize(1);
    }

    @Test
    void shouldFindByClientId() {
        when(reviewRepository.findByClientId(1L)).thenReturn(List.of(review));

        List<Review> list = reviewRepository.findByClientId(1L);

        assertThat(list).hasSize(1);
    }

    @Test
    void shouldFindByReservationId() {
        when(reviewRepository.findByReservationId(100L)).thenReturn(Optional.of(review));

        Optional<Review> found = reviewRepository.findByReservationId(100L);

        assertThat(found).isPresent();
        assertThat(found.get().getRating()).isEqualTo(5);
    }

    @Test
    void shouldExistsByReservationId() {
        when(reviewRepository.existsByReservationId(100L)).thenReturn(true);

        Boolean exists = reviewRepository.existsByReservationId(100L);

        assertThat(exists).isTrue();
    }

    @Test
    void shouldGetAverageRatingByCarId() {
        when(reviewRepository.getAverageRatingByCarId(10L)).thenReturn(5.0);

        Double avg = reviewRepository.getAverageRatingByCarId(10L);

        assertThat(avg).isEqualTo(5.0);
    }

    @Test
    void shouldCountByCarId() {
        when(reviewRepository.countByCarId(10L)).thenReturn(1L);

        Long count = reviewRepository.countByCarId(10L);

        assertThat(count).isEqualTo(1L);
    }
}
