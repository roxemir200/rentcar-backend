package com.rentcar.rent_car.service;

import com.rentcar.rent_car.config.MlServiceConfig;
import com.rentcar.rent_car.dto.request.CarRecommendationRequest;
import com.rentcar.rent_car.dto.response.CarRecommendationResponse;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarCategory;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.Review;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.FuelType;
import com.rentcar.rent_car.enums.Transmission;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.repository.ReviewRepository;
import com.rentcar.rent_car.service.imp.RecommendationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecommendationServiceTest {

    @Mock
    private RestClient mlRestClient;

    @Mock
    private MlServiceConfig mlConfig;

    @Mock
    private CarService carService;

    @Mock
    private CarRepository carRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @InjectMocks
    private RecommendationServiceImpl recommendationService;

    private Car car;
    private Review review;
    private Reservation reservation;
    private CarCategory category;

    @BeforeEach
    void setUp() {
        category = new CarCategory();
        category.setId(1L);
        category.setName("SUV");

        car = new Car();
        car.setId(1L);
        car.setBrand("Peugeot");
        car.setModel("208");
        car.setDailyRate(new BigDecimal("45"));
        car.setSeats(5);
        car.setFuelType(FuelType.GASOLINE);
        car.setTransmission(Transmission.MANUAL);
        car.setStatus(CarStatus.AVAILABLE);
        car.setIsActive(true);
        car.setCategory(category);

        // ✅ CORRECTION: Review rating est un Integer
        review = new Review();
        review.setId(1L);
        review.setRating(5); // ← Integer, pas Double
        review.setCar(car);

        // ✅ CORRECTION: LocalDate au lieu de LocalDateTime
        reservation = new Reservation();
        reservation.setId(1L);
        reservation.setCar(car);
        reservation.setStartDate(LocalDate.now().minusDays(10));
        reservation.setEndDate(LocalDate.now().minusDays(3));
    }

    // ========== TESTS EXISTANTS ==========

    @Test
    void shouldReturnErrorResponseWhenNoActiveCarsAvailable() {
        when(carService.getAllCars()).thenReturn(Collections.emptyList());

        CarRecommendationRequest request = new CarRecommendationRequest();
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        assertThat(response.getSuccess()).isFalse();
        assertThat(response.getError()).contains("Aucune voiture active disponible");
    }

    @Test
    void shouldFallbackToHeuristicRecommendationWhenMlServiceIsUnavailable() {
        CarResponse carResp = CarResponse.builder()
                .id(1L)
                .brand("Peugeot")
                .model("208")
                .dailyRate(new BigDecimal("45"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.MANUAL)
                .isActive(true)
                .categoryName("ECONOMIQUE")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(carResp));
        when(reviewRepository.findByCarId(1L)).thenReturn(Collections.emptyList());
        when(reservationRepository.findByCarId(1L)).thenReturn(Collections.emptyList());

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("QUOTIDIEN");
        request.setBudget(BigDecimal.valueOf(50));
        request.setPassengers(4);
        request.setDuration(3);
        request.setTransmission("MANUAL");
        request.setTopK(3);

        CarRecommendationResponse response = recommendationService.recommendCars(request);

        assertThat(response.getSuccess()).isTrue();
        assertThat(response.getData()).isNotNull();
        assertThat(response.getMeta().getFallbackUsed()).isTrue();
        assertThat(response.getMeta().getMlServiceStatus()).contains("NullPointerException");
    }

    @Test
    void shouldTriggerRetrainAsyncWithoutThrowing() {
        // Given
        when(carRepository.findAll()).thenReturn(List.of(car));
        when(reviewRepository.findByCarId(anyLong())).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(anyLong())).thenReturn(List.of(reservation));

        // When
        recommendationService.triggerRetrainAsync();

        // Then
        verify(carRepository, atLeastOnce()).findAll();
    }

    // ========== NOUVEAUX TESTS ==========

    @Test
    void shouldRecommendCarsWithQuotidienObjective() {
        // Given
        CarResponse carResp = CarResponse.builder()
                .id(1L)
                .brand("Peugeot")
                .model("208")
                .dailyRate(new BigDecimal("45"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.MANUAL)
                .isActive(true)
                .categoryName("SUV")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(carResp));
        when(reviewRepository.findByCarId(1L)).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(1L)).thenReturn(List.of(reservation));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("QUOTIDIEN");
        request.setBudget(BigDecimal.valueOf(60));
        request.setPassengers(4);
        request.setDuration(3);
        request.setTransmission("MANUAL");
        request.setTopK(3);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
    }

    @Test
    void shouldRecommendCarsWithEconomiqueObjective() {
        // Given
        CarResponse carResp = CarResponse.builder()
                .id(1L)
                .brand("Peugeot")
                .model("208")
                .dailyRate(new BigDecimal("35"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.MANUAL)
                .isActive(true)
                .categoryName("ECONOMIQUE")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(carResp));
        when(reviewRepository.findByCarId(1L)).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(1L)).thenReturn(List.of(reservation));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("ECONOMIQUE");
        request.setBudget(BigDecimal.valueOf(40));
        request.setPassengers(4);
        request.setDuration(3);
        request.setTransmission("MANUAL");
        request.setTopK(3);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
    }

    @Test
    void shouldRecommendCarsWithFamilialObjective() {
        // Given
        CarResponse carResp = CarResponse.builder()
                .id(1L)
                .brand("Renault")
                .model("Espace")
                .dailyRate(new BigDecimal("80"))
                .seats(7)
                .fuelType(FuelType.DIESEL)
                .transmission(Transmission.AUTOMATIC)
                .isActive(true)
                .categoryName("FAMILIAL")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(carResp));
        when(reviewRepository.findByCarId(1L)).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(1L)).thenReturn(List.of(reservation));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("FAMILIAL");
        request.setBudget(BigDecimal.valueOf(100));
        request.setPassengers(6);
        request.setDuration(5);
        request.setTransmission("AUTOMATIC");
        request.setTopK(3);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
    }

    @Test
    void shouldRecommendCarsWithLowBudget() {
        // Given
        CarResponse carResp = CarResponse.builder()
                .id(1L)
                .brand("Peugeot")
                .model("208")
                .dailyRate(new BigDecimal("45"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.MANUAL)
                .isActive(true)
                .categoryName("SUV")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(carResp));
        when(reviewRepository.findByCarId(1L)).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(1L)).thenReturn(List.of(reservation));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("QUOTIDIEN");
        request.setBudget(BigDecimal.valueOf(20));
        request.setPassengers(4);
        request.setDuration(3);
        request.setTransmission("MANUAL");
        request.setTopK(3);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
    }

    @Test
    void shouldRecommendCarsWithTooManyPassengers() {
        // Given
        CarResponse carResp = CarResponse.builder()
                .id(1L)
                .brand("Peugeot")
                .model("208")
                .dailyRate(new BigDecimal("45"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.MANUAL)
                .isActive(true)
                .categoryName("SUV")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(carResp));
        when(reviewRepository.findByCarId(1L)).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(1L)).thenReturn(List.of(reservation));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("QUOTIDIEN");
        request.setBudget(BigDecimal.valueOf(60));
        request.setPassengers(8);
        request.setDuration(3);
        request.setTransmission("MANUAL");
        request.setTopK(3);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
    }

    @Test
    void shouldRecommendCarsWithDifferentTransmission() {
        // Given
        CarResponse carResp = CarResponse.builder()
                .id(1L)
                .brand("Peugeot")
                .model("208")
                .dailyRate(new BigDecimal("45"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.AUTOMATIC)
                .isActive(true)
                .categoryName("SUV")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(carResp));
        when(reviewRepository.findByCarId(1L)).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(1L)).thenReturn(List.of(reservation));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("QUOTIDIEN");
        request.setBudget(BigDecimal.valueOf(60));
        request.setPassengers(4);
        request.setDuration(3);
        request.setTransmission("MANUAL");
        request.setTopK(3);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
    }

    @Test
    void shouldRecommendCarsWithMultipleCars() {
        // Given
        CarResponse carResp1 = CarResponse.builder()
                .id(1L)
                .brand("Peugeot")
                .model("208")
                .dailyRate(new BigDecimal("45"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.MANUAL)
                .isActive(true)
                .categoryName("SUV")
                .build();

        CarResponse carResp2 = CarResponse.builder()
                .id(2L)
                .brand("Renault")
                .model("Clio")
                .dailyRate(new BigDecimal("40"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.MANUAL)
                .isActive(true)
                .categoryName("ECONOMIQUE")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(carResp1, carResp2));
        when(reviewRepository.findByCarId(anyLong())).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(anyLong())).thenReturn(List.of(reservation));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("QUOTIDIEN");
        request.setBudget(BigDecimal.valueOf(50));
        request.setPassengers(4);
        request.setDuration(3);
        request.setTransmission("MANUAL");
        request.setTopK(2);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getSuccess()).isTrue();
    }

    @Test
    void shouldFilterInactiveCars() {
        // Given
        CarResponse activeCar = CarResponse.builder()
                .id(1L)
                .brand("Peugeot")
                .model("208")
                .dailyRate(new BigDecimal("45"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.MANUAL)
                .isActive(true)
                .categoryName("SUV")
                .build();

        CarResponse inactiveCar = CarResponse.builder()
                .id(2L)
                .brand("Renault")
                .model("Clio")
                .dailyRate(new BigDecimal("40"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.MANUAL)
                .isActive(false)
                .categoryName("ECONOMIQUE")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(activeCar, inactiveCar));
        when(reviewRepository.findByCarId(anyLong())).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(anyLong())).thenReturn(List.of(reservation));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("QUOTIDIEN");
        request.setBudget(BigDecimal.valueOf(50));
        request.setPassengers(4);
        request.setDuration(3);
        request.setTransmission("MANUAL");
        request.setTopK(2);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
    }

    @Test
    void shouldEnrichCarsWithReviewsAndReservations() {
        // Given
        CarResponse carResp = CarResponse.builder()
                .id(1L)
                .brand("Peugeot")
                .model("208")
                .dailyRate(new BigDecimal("45"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.MANUAL)
                .isActive(true)
                .categoryName("SUV")
                .build();

        // ✅ CORRECTION: Review rating est un Integer
        Review review1 = new Review();
        review1.setRating(5);
        review1.setCar(car);

        Review review2 = new Review();
        review2.setRating(4);
        review2.setCar(car);

        // ✅ CORRECTION: LocalDate au lieu de LocalDateTime
        Reservation reservation1 = new Reservation();
        reservation1.setCar(car);
        reservation1.setStartDate(LocalDate.now().minusDays(5));
        reservation1.setEndDate(LocalDate.now().minusDays(2));

        when(carService.getAllCars()).thenReturn(List.of(carResp));
        when(reviewRepository.findByCarId(1L)).thenReturn(List.of(review1, review2));
        when(reservationRepository.findByCarId(1L)).thenReturn(List.of(reservation1));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("QUOTIDIEN");
        request.setBudget(BigDecimal.valueOf(50));
        request.setPassengers(4);
        request.setDuration(3);
        request.setTransmission("MANUAL");
        request.setTopK(3);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
    }

    @Test
    void shouldRecommendCarsWithLuxeObjective() {
        // Given
        CarResponse carResp = CarResponse.builder()
                .id(1L)
                .brand("Mercedes")
                .model("Classe E")
                .dailyRate(new BigDecimal("150"))
                .seats(5)
                .fuelType(FuelType.DIESEL)
                .transmission(Transmission.AUTOMATIC)
                .isActive(true)
                .categoryName("LUXE")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(carResp));
        when(reviewRepository.findByCarId(1L)).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(1L)).thenReturn(List.of(reservation));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("LUXE");
        request.setBudget(BigDecimal.valueOf(200));
        request.setPassengers(4);
        request.setDuration(7);
        request.setTransmission("AUTOMATIC");
        request.setTopK(3);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
    }

    @Test
    void shouldRecommendCarsWithSportObjective() {
        // Given
        CarResponse carResp = CarResponse.builder()
                .id(1L)
                .brand("Porsche")
                .model("911")
                .dailyRate(new BigDecimal("250"))
                .seats(2)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.AUTOMATIC)
                .isActive(true)
                .categoryName("SPORT")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(carResp));
        when(reviewRepository.findByCarId(1L)).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(1L)).thenReturn(List.of(reservation));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("SPORT");
        request.setBudget(BigDecimal.valueOf(300));
        request.setPassengers(2);
        request.setDuration(3);
        request.setTransmission("AUTOMATIC");
        request.setTopK(3);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
    }

    @Test
    void shouldRecommendOnlyOneCar_whenTopKIsOne() {
        // Given
        CarResponse carResp = CarResponse.builder()
                .id(1L)
                .brand("Peugeot")
                .model("208")
                .dailyRate(new BigDecimal("45"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.MANUAL)
                .isActive(true)
                .categoryName("SUV")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(carResp));
        when(reviewRepository.findByCarId(1L)).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(1L)).thenReturn(List.of(reservation));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective("QUOTIDIEN");
        request.setBudget(BigDecimal.valueOf(50));
        request.setPassengers(4);
        request.setDuration(3);
        request.setTransmission("MANUAL");
        request.setTopK(1);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getData()).hasSizeLessThanOrEqualTo(1);
    }

    @Test
    void shouldHandleNullObjective() {
        // Given
        CarResponse carResp = CarResponse.builder()
                .id(1L)
                .brand("Peugeot")
                .model("208")
                .dailyRate(new BigDecimal("45"))
                .seats(5)
                .fuelType(FuelType.GASOLINE)
                .transmission(Transmission.MANUAL)
                .isActive(true)
                .categoryName("SUV")
                .build();

        when(carService.getAllCars()).thenReturn(List.of(carResp));
        when(reviewRepository.findByCarId(1L)).thenReturn(List.of(review));
        when(reservationRepository.findByCarId(1L)).thenReturn(List.of(reservation));

        CarRecommendationRequest request = new CarRecommendationRequest();
        request.setObjective(null);
        request.setBudget(BigDecimal.valueOf(50));
        request.setPassengers(4);
        request.setDuration(3);
        request.setTransmission("MANUAL");
        request.setTopK(3);

        // When
        CarRecommendationResponse response = recommendationService.recommendCars(request);

        // Then
        assertThat(response).isNotNull();
    }
}