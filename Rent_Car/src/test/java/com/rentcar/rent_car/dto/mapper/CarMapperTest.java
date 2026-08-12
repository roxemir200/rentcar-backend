package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.CarRequest;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarImage;
import com.rentcar.rent_car.entity.CarCategory;
import com.rentcar.rent_car.repository.CarCategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CarMapperTest {

    @Mock
    private CarCategoryRepository categoryRepository;

    @InjectMocks
    private CarMapper carMapper;

    private CarCategory category;
    private CarRequest carRequest;

    @BeforeEach
    void setUp() {
        category = new CarCategory();
        category.setId(1L);
        category.setName("SUV");

        carRequest = new CarRequest();
        carRequest.setBrand("Toyota");
        carRequest.setModel("RAV4");
        carRequest.setYear(2023);
        carRequest.setRegistrationNumber("AB-123-CD");
        carRequest.setColor("Rouge");
        carRequest.setMileage(15000);
        carRequest.setSeats(5);
        carRequest.setDailyRate(BigDecimal.valueOf(120.00));
        carRequest.setDescription("SUV confortable");
        carRequest.setCategoryId(1L);
    }

    // ========== Tests pour toEntity ==========

    @Test
    void toEntity_shouldReturnNull_whenRequestIsNull() {
        // Given
        CarRequest request = null;

        // When
        Car result = carMapper.toEntity(request);

        // Then
        assertThat(result).isNull();
    }

    @Test
    void toEntity_shouldThrowException_whenCategoryNotFound() {
        // Given
        when(categoryRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> carMapper.toEntity(carRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Catégorie non trouvée");
    }

    @Test
    void toEntity_shouldMapAllFieldsCorrectly() {
        // Given
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        // When
        Car result = carMapper.toEntity(carRequest);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getBrand()).isEqualTo("Toyota");
        assertThat(result.getModel()).isEqualTo("RAV4");
        assertThat(result.getYear()).isEqualTo(2023);
        assertThat(result.getRegistrationNumber()).isEqualTo("AB-123-CD");
        assertThat(result.getColor()).isEqualTo("Rouge");
        assertThat(result.getMileage()).isEqualTo(15000);
        assertThat(result.getSeats()).isEqualTo(5);
        assertThat(result.getDailyRate()).isEqualTo(BigDecimal.valueOf(120.00));
        assertThat(result.getDescription()).isEqualTo("SUV confortable");
        assertThat(result.getCategory()).isEqualTo(category);
    }

    // ========== Tests pour toResponse ==========

    @Test
    void toResponse_shouldReturnNull_whenCarIsNull() {
        // Given
        Car car = null;

        // When
        CarResponse result = carMapper.toResponse(car);

        // Then
        assertThat(result).isNull();
    }

    @Test
    void toResponse_shouldHandleNullImages() {
        // Given
        Car car = new Car();
        car.setId(1L);
        car.setBrand("Toyota");
        car.setModel("RAV4");
        car.setImages(null); // ← Condition non couverte !
        car.setCategory(category);
        car.setIsActive(true);
        car.setAverageRating(4.5);
        car.setReviews(new ArrayList<>());

        // When
        CarResponse result = carMapper.toResponse(car);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getImages()).isEmpty(); // ← Doit retourner une liste vide
        assertThat(result.getPrimaryImage()).isNull(); // ← Doit être null
        assertThat(result.getReviewCount()).isZero();
        assertThat(result.getCategoryName()).isEqualTo("SUV");
    }

    @Test
    void toResponse_shouldHandleEmptyImagesList() {
        // Given
        Car car = new Car();
        car.setId(1L);
        car.setBrand("Toyota");
        car.setModel("RAV4");
        car.setImages(new ArrayList<>()); // Liste vide
        car.setCategory(category);

        // When
        CarResponse result = carMapper.toResponse(car);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getImages()).isEmpty();
        assertThat(result.getPrimaryImage()).isNull();
    }

    @Test
    void toResponse_shouldFindPrimaryImage() {
        // Given
        Car car = new Car();
        car.setId(1L);
        car.setBrand("Toyota");
        car.setModel("RAV4");
        car.setCategory(category);

        CarImage image1 = new CarImage();
        image1.setImageUrl("image1.jpg");
        image1.setIsPrimary(true);

        CarImage image2 = new CarImage();
        image2.setImageUrl("image2.jpg");
        image2.setIsPrimary(false);

        car.setImages(List.of(image1, image2));

        // When
        CarResponse result = carMapper.toResponse(car);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getImages()).containsExactly("image1.jpg", "image2.jpg");
        assertThat(result.getPrimaryImage()).isEqualTo("image1.jpg");
    }

    @Test
    void toResponse_shouldHandleNullCategory() {
        // Given
        Car car = new Car();
        car.setId(1L);
        car.setBrand("Toyota");
        car.setModel("RAV4");
        car.setCategory(null); // Category null
        car.setImages(new ArrayList<>());

        // When
        CarResponse result = carMapper.toResponse(car);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCategoryName()).isNull();
        assertThat(result.getCategoryId()).isNull();
    }

    @Test
    void toResponse_shouldHandleNullReviews() {
        // Given
        Car car = new Car();
        car.setId(1L);
        car.setBrand("Toyota");
        car.setModel("RAV4");
        car.setCategory(category);
        car.setImages(new ArrayList<>());
        car.setReviews(null); // Reviews null

        // When
        CarResponse result = carMapper.toResponse(car);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getReviewCount()).isZero(); // Vérifie que reviewCount est 0
    }

    // ========== Tests pour updateEntity ==========

    @Test
    void updateEntity_shouldDoNothing_whenCarIsNull() {
        // Given
        Car car = null;
        CarRequest request = carRequest;

        // When
        carMapper.updateEntity(car, request);

        // Then
        assertThat(car).isNull(); // Rien ne se passe
    }

    @Test
    void updateEntity_shouldDoNothing_whenRequestIsNull() {
        // Given
        Car car = new Car();
        CarRequest request = null;

        // When
        carMapper.updateEntity(car, request);

        // Then
        // Le car n'est pas modifié
        assertThat(car.getBrand()).isNull();
    }

    @Test
    void updateEntity_shouldUpdateFieldsCorrectly() {
        // Given
        Car car = new Car();
        car.setBrand("Old Brand");
        car.setModel("Old Model");

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        // When
        carMapper.updateEntity(car, carRequest);

        // Then
        assertThat(car.getBrand()).isEqualTo("Toyota");
        assertThat(car.getModel()).isEqualTo("RAV4");
        assertThat(car.getYear()).isEqualTo(2023);
        assertThat(car.getCategory()).isEqualTo(category);
    }

    @Test
    void updateEntity_shouldNotUpdateCategory_whenCategoryIdIsNull() {
        // Given
        Car car = new Car();
        car.setCategory(category);

        CarRequest request = new CarRequest();
        request.setBrand("Toyota");
        request.setModel("RAV4");
        request.setCategoryId(null); // CategoryId null

        // When
        carMapper.updateEntity(car, request);

        // Then
        assertThat(car.getCategory()).isEqualTo(category); // Category non modifiée
    }
}