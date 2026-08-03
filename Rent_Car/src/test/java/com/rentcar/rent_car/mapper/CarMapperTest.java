package com.rentcar.rent_car.mapper;

import com.rentcar.rent_car.dto.mapper.CarMapper;
import com.rentcar.rent_car.dto.request.CarRequest;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarCategory;
import com.rentcar.rent_car.entity.CarImage;
import com.rentcar.rent_car.enums.FuelType;
import com.rentcar.rent_car.enums.Transmission;
import com.rentcar.rent_car.repository.CarCategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CarMapperTest {

    @Mock
    private CarCategoryRepository categoryRepository;

    private CarMapper carMapper;

    @BeforeEach
    void setUp() {
        carMapper = new CarMapper(categoryRepository);
    }

    @Test
    void shouldMapCarRequestToEntity() {
        CarRequest request = new CarRequest();
        request.setBrand("BMW");
        request.setModel("X5");
        request.setCategoryId(2L);
        request.setDailyRate(new BigDecimal("120"));
        request.setFuelType(FuelType.GASOLINE);
        request.setTransmission(Transmission.AUTOMATIC);

        CarCategory category = new CarCategory();
        category.setId(2L);
        category.setName("SUV");
        when(categoryRepository.findById(2L)).thenReturn(Optional.of(category));

        Car result = carMapper.toEntity(request);

        assertThat(result.getBrand()).isEqualTo("BMW");
        assertThat(result.getCategory()).isNotNull();
    }

    @Test
    void shouldMapCarToResponse() {
        Car car = new Car();
        car.setId(1L);
        car.setBrand("BMW");
        car.setModel("X5");
        car.setDailyRate(new BigDecimal("120"));

        CarCategory category = new CarCategory();
        category.setId(2L);
        category.setName("SUV");
        car.setCategory(category);

        CarImage image = new CarImage();
        image.setImageUrl("img.jpg");
        image.setIsPrimary(true);
        car.setImages(List.of(image));

        CarResponse result = carMapper.toResponse(car);

        assertThat(result.getBrand()).isEqualTo("BMW");
        assertThat(result.getPrimaryImage()).isEqualTo("img.jpg");
        assertThat(result.getCategoryName()).isEqualTo("SUV");
    }

    @Test
    void shouldHandleNullValues() {
        Car car = new Car();
        CarResponse result = carMapper.toResponse(car);

        assertThat(result).isNotNull();
        assertThat(result.getImages()).isEmpty();
    }
}
