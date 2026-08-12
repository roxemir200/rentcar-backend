package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.CarRequest;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarCategory;
import com.rentcar.rent_car.entity.CarImage;
import com.rentcar.rent_car.entity.Review;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.FuelType;
import com.rentcar.rent_car.enums.Transmission;
import com.rentcar.rent_car.repository.CarCategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
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
        carRequest.setFuelType(FuelType.DIESEL);
        carRequest.setTransmission(Transmission.AUTOMATIC);
        carRequest.setDailyRate(BigDecimal.valueOf(120.00));
        carRequest.setDescription("SUV confortable");
        carRequest.setCategoryId(1L);
    }

    @Test
    void toEntity_shouldReturnNull_whenRequestIsNull() {
        assertThat(carMapper.toEntity(null)).isNull();
    }

    @Test
    void toEntity_shouldThrowException_whenCategoryNotFound() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> carMapper.toEntity(carRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Catégorie non trouvée");
    }

    @Test
    void toEntity_shouldMapAllFieldsCorrectly() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        Car result = carMapper.toEntity(carRequest);

        assertThat(result).isNotNull();
        assertThat(result.getBrand()).isEqualTo("Toyota");
        assertThat(result.getModel()).isEqualTo("RAV4");
        assertThat(result.getYear()).isEqualTo(2023);
        assertThat(result.getCategory()).isEqualTo(category);
    }

    @Test
    void toResponse_shouldReturnNull_whenCarIsNull() {
        assertThat(carMapper.toResponse(null)).isNull();
    }

    @Test
    void toResponse_shouldMapCarWithFullImagesAndPrimaryImage() {
        Car car = new Car();
        car.setId(10L);
        car.setBrand("Toyota");
        car.setModel("RAV4");
        car.setCategory(category);
        car.setStatus(CarStatus.AVAILABLE);

        CarImage img1 = new CarImage();
        img1.setImageUrl("primary.jpg");
        img1.setIsPrimary(true);

        CarImage img2 = new CarImage();
        img2.setImageUrl("sec.jpg");
        img2.setIsPrimary(false);

        car.setImages(List.of(img1, img2));
        Review review = new Review();
        review.setRating(5);
        car.setReviews(List.of(review));

        CarResponse result = carMapper.toResponse(car);

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getImages()).containsExactly("primary.jpg", "sec.jpg");
        assertThat(result.getPrimaryImage()).isEqualTo("primary.jpg");
        assertThat(result.getCategoryName()).isEqualTo("SUV");
        assertThat(result.getReviewCount()).isEqualTo(1);
    }

    @Test
    void toResponse_shouldHandleImagesWithoutPrimaryImage() {
        Car car = new Car();
        car.setId(10L);

        CarImage img1 = new CarImage();
        img1.setImageUrl("sec.jpg");
        img1.setIsPrimary(false);

        car.setImages(List.of(img1));

        CarResponse result = carMapper.toResponse(car);

        assertThat(result.getImages()).containsExactly("sec.jpg");
        assertThat(result.getPrimaryImage()).isNull();
    }

    @Test
    void toResponse_shouldHandleNullImagesAndNullReviewsAndNullCategory() {
        Car car = new Car();
        car.setId(10L);

        CarResponse result = carMapper.toResponse(car);

        assertThat(result.getImages()).isEmpty();
        assertThat(result.getPrimaryImage()).isNull();
        assertThat(result.getCategoryName()).isNull();
        assertThat(result.getCategoryId()).isNull();
        assertThat(result.getReviewCount()).isEqualTo(0);
    }

    @Test
    void updateEntity_shouldDoNothing_whenCarOrRequestIsNull() {
        carMapper.updateEntity(null, null);
        carMapper.updateEntity(new Car(), null);
    }

    @Test
    void updateEntity_shouldUpdateCategory_whenCategoryIdIsProvided() {
        Car car = new Car();
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        carMapper.updateEntity(car, carRequest);

        assertThat(car.getBrand()).isEqualTo("Toyota");
        assertThat(car.getCategory()).isEqualTo(category);
    }

    @Test
    void updateEntity_shouldNotUpdateCategory_whenCategoryIdIsNull() {
        Car car = new Car();
        carRequest.setCategoryId(null);

        carMapper.updateEntity(car, carRequest);

        assertThat(car.getBrand()).isEqualTo("Toyota");
    }

    @Test
    void updateEntity_shouldThrow_whenCategoryNotFound() {
        Car car = new Car();
        when(categoryRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> carMapper.updateEntity(car, carRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Catégorie non trouvée");
    }
}