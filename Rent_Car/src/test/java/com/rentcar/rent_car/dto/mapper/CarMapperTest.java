package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.CarRequest;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarCategory;
import com.rentcar.rent_car.entity.CarImage;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CarMapperTest {

    @Mock
    private CarCategoryRepository categoryRepository;

    @InjectMocks
    private CarMapper carMapper;

    private CarCategory category;

    @BeforeEach
    void setUp() {
        category = new CarCategory();
        category.setId(10L);
        category.setName("Économie");
    }

    @Test
    void toEntity_shouldMapRequestToCar() {
        CarRequest request = new CarRequest();
        request.setBrand("Toyota");
        request.setModel("Yaris");
        request.setYear(2024);
        request.setRegistrationNumber("AB-123-CD");
        request.setColor("Noir");
        request.setMileage(12000);
        request.setSeats(5);
        request.setFuelType(com.rentcar.rent_car.enums.FuelType.GASOLINE);
        request.setTransmission(com.rentcar.rent_car.enums.Transmission.MANUAL);
        request.setDailyRate(new BigDecimal("80"));
        request.setDescription("Belle voiture");
        request.setCategoryId(10L);

        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));

        Car car = carMapper.toEntity(request);

        assertThat(car.getBrand()).isEqualTo("Toyota");
        assertThat(car.getModel()).isEqualTo("Yaris");
        assertThat(car.getCategory()).isNotNull();
        assertThat(car.getCategory().getId()).isEqualTo(10L);
    }

    @Test
    void toResponse_shouldMapCarWithImages() {
        Car car = new Car();
        car.setId(1L);
        car.setBrand("Renault");
        car.setModel("Clio");
        car.setDailyRate(new BigDecimal("55"));
        car.setStatus(com.rentcar.rent_car.enums.CarStatus.AVAILABLE);
        car.setDescription("Voiture compacte");
        car.setIsActive(true);
        car.setCategory(category);

        CarImage image1 = new CarImage();
        image1.setImageUrl("/img/1.jpg");
        image1.setIsPrimary(true);
        image1.setCar(car);

        CarImage image2 = new CarImage();
        image2.setImageUrl("/img/2.jpg");
        image2.setIsPrimary(false);
        image2.setCar(car);

        car.setImages(List.of(image1, image2));

        CarResponse response = carMapper.toResponse(car);

        assertThat(response.getBrand()).isEqualTo("Renault");
        assertThat(response.getModel()).isEqualTo("Clio");
        assertThat(response.getImages()).contains("/img/1.jpg", "/img/2.jpg");
        assertThat(response.getPrimaryImage()).isEqualTo("/img/1.jpg");
        assertThat(response.getCategoryName()).isEqualTo("Économie");
    }
}
