package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.response.PublicStatsResponse;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.ReviewRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.service.imp.PublicStatsServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicStatsServiceTest {

    @Mock
    private CarRepository carRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @InjectMocks
    private PublicStatsServiceImpl publicStatsService;

    @Test
    void shouldReturnPublicStats() {
        when(carRepository.count()).thenReturn(12L);
        when(userRepository.countByRole(Role.CLIENT)).thenReturn(37L);
        when(reviewRepository.count()).thenReturn(9L);
        when(reviewRepository.getAverageRating()).thenReturn(4.333333333333333);

        PublicStatsResponse stats = publicStatsService.getPublicStats();

        assertThat(stats.getVehicles()).isEqualTo(12L);
        assertThat(stats.getClients()).isEqualTo(37L);
        assertThat(stats.getReviews()).isEqualTo(9L);
        assertThat(stats.getAverageRating()).isEqualTo(4.3);
    }

    /**
     * Une base sans avis renvoie {@code null}, pas zero : afficher « 0★ »
     * donnerait a lire une insatisfaction generale, alors qu'aucun client ne
     * s'est encore prononce. Le frontend masque la vignette dans ce cas.
     */
    @Test
    void shouldReturnNullRating_whenNoReviewYet() {
        when(carRepository.count()).thenReturn(3L);
        when(userRepository.countByRole(Role.CLIENT)).thenReturn(0L);
        when(reviewRepository.count()).thenReturn(0L);
        when(reviewRepository.getAverageRating()).thenReturn(null);

        PublicStatsResponse stats = publicStatsService.getPublicStats();

        assertThat(stats.getAverageRating()).isNull();
        assertThat(stats.getVehicles()).isEqualTo(3L);
    }

    @Test
    void shouldRoundRatingToOneDecimal() {
        when(carRepository.count()).thenReturn(1L);
        when(userRepository.countByRole(Role.CLIENT)).thenReturn(1L);
        when(reviewRepository.count()).thenReturn(2L);
        when(reviewRepository.getAverageRating()).thenReturn(3.96);

        assertThat(publicStatsService.getPublicStats().getAverageRating()).isEqualTo(4.0);
    }
}
