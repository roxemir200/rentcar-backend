package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarImage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CarImageRepositoryTest {

    @Mock
    private CarImageRepository imageRepository;

    private CarImage primaryImg;

    @BeforeEach
    void setUp() {
        Car car = new Car();
        car.setId(1L);

        primaryImg = new CarImage();
        primaryImg.setId(10L);
        primaryImg.setCar(car);
        primaryImg.setImageUrl("img1.png");
        primaryImg.setIsPrimary(true);
    }

    @Test
    void shouldFindByCarId() {
        when(imageRepository.findByCarId(1L)).thenReturn(List.of(primaryImg));

        List<CarImage> images = imageRepository.findByCarId(1L);

        assertThat(images).hasSize(1);
    }

    @Test
    void shouldFindByCarIdAndIsPrimaryTrue() {
        when(imageRepository.findByCarIdAndIsPrimaryTrue(1L)).thenReturn(Optional.of(primaryImg));

        Optional<CarImage> found = imageRepository.findByCarIdAndIsPrimaryTrue(1L);

        assertThat(found).isPresent();
        assertThat(found.get().getImageUrl()).isEqualTo("img1.png");
    }

    @Test
    void shouldDeleteByCarId() {
        imageRepository.deleteByCarId(1L);

        verify(imageRepository).deleteByCarId(1L);
    }
}
