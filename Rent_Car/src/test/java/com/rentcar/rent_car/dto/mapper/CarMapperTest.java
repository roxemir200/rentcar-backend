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
    private CarRequest request;

    @BeforeEach
    void setUp() {
        category = new CarCategory();
        category.setId(1L);
        category.setName("SUV");

        request = new CarRequest();
        request.setBrand("BMW");
        request.setModel("X5");
        request.setYear(2023);
        request.setRegistrationNumber("AB-123-CD");
        request.setColor("Noir");
        request.setMileage(15000);
        request.setSeats(5);
        request.setFuelType(FuelType.DIESEL);
        request.setTransmission(Transmission.AUTOMATIC);
        request.setDailyRate(new BigDecimal("120.00"));
        request.setDescription("Superbe voiture");
        request.setCategoryId(1L);
    }

    @Test
    void shouldToEntity_whenCategoryExists() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        Car car = carMapper.toEntity(request);

        assertThat(car.getBrand()).isEqualTo("BMW");
        assertThat(car.getCategory()).isEqualTo(category);
    }

    @Test
    void shouldThrow_whenCategoryNotFoundInToEntity() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> carMapper.toEntity(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Catégorie non trouvée");
    }

    @Test
    void shouldToResponse_withFullImagesAndPrimaryImage() {
        Car car = new Car();
        car.setId(10L);
        car.setBrand("BMW");
        car.setModel("X5");
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

        CarResponse response = carMapper.toResponse(car);

        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getImages()).containsExactly("primary.jpg", "sec.jpg");
        assertThat(response.getPrimaryImage()).isEqualTo("primary.jpg");
        assertThat(response.getReviewCount()).isEqualTo(1);
    }

    @Test
    void shouldToResponse_withNullImagesAndNullReviews() {
        Car car = new Car();
        car.setId(10L);

        CarResponse response = carMapper.toResponse(car);

        assertThat(response.getImages()).isEmpty();
        assertThat(response.getPrimaryImage()).isNull();
        assertThat(response.getReviewCount()).isEqualTo(0);
    }

    @Test
    void shouldUpdateEntity_withCategoryId() {
        Car car = new Car();
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        carMapper.updateEntity(car, request);

        assertThat(car.getBrand()).isEqualTo("BMW");
        assertThat(car.getCategory()).isEqualTo(category);
    }

    @Test
    void shouldUpdateEntity_withoutCategoryId() {
        Car car = new Car();
        request.setCategoryId(null);

        carMapper.updateEntity(car, request);

        assertThat(car.getBrand()).isEqualTo("BMW");
    }
}
