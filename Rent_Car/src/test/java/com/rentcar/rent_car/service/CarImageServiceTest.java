package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarImage;
import com.rentcar.rent_car.repository.CarImageRepository;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.service.imp.CarImageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CarImageServiceTest {

    @Mock
    private CarImageRepository carImageRepository;

    @Mock
    private CarRepository carRepository;

    @InjectMocks
    private CarImageServiceImpl carImageService;

    private Car car;
    private CarImage image;

    @BeforeEach
    void setUp() {
        car = new Car();
        car.setId(1L);

        image = new CarImage();
        image.setId(10L);
        image.setImageUrl("test.jpg");
        image.setIsPrimary(true);
        image.setCar(car);
    }

    @Test
    void shouldAddImageToCar_whenIsPrimary() {
        CarImage oldPrimary = new CarImage();
        oldPrimary.setId(9L);
        oldPrimary.setIsPrimary(true);

        when(carRepository.findById(1L)).thenReturn(Optional.of(car));
        when(carImageRepository.findByCarIdAndIsPrimaryTrue(1L)).thenReturn(Optional.of(oldPrimary));

        MessageResponse response = carImageService.addImageToCar(1L, "new.jpg", true);

        assertThat(response.isSuccess()).isTrue();
        assertThat(oldPrimary.getIsPrimary()).isFalse();
        verify(carImageRepository).save(oldPrimary);
        verify(carImageRepository, times(2)).save(any(CarImage.class));
    }

    @Test
    void shouldAddImageToCar_whenNotPrimary() {
        when(carRepository.findById(1L)).thenReturn(Optional.of(car));

        MessageResponse response = carImageService.addImageToCar(1L, "new.jpg", false);

        assertThat(response.isSuccess()).isTrue();
        verify(carImageRepository, times(1)).save(any(CarImage.class));
    }

    @Test
    void shouldThrow_whenAddImageCarNotFound() {
        when(carRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> carImageService.addImageToCar(99L, "url", true))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Voiture non trouvée");
    }

    @Test
    void shouldGetImagesByCarId() {
        when(carImageRepository.findByCarId(1L)).thenReturn(List.of(image));

        List<String> images = carImageService.getImagesByCarId(1L);

        assertThat(images).containsExactly("test.jpg");
    }

    @Test
    void shouldGetPrimaryImageByCarId_explicitPrimary() {
        when(carImageRepository.findByCarIdAndIsPrimaryTrue(1L)).thenReturn(Optional.of(image));

        String primary = carImageService.getPrimaryImageByCarId(1L);

        assertThat(primary).isEqualTo("test.jpg");
    }

    @Test
    void shouldGetPrimaryImageByCarId_fallbackFirstImage() {
        image.setIsPrimary(false);
        when(carImageRepository.findByCarIdAndIsPrimaryTrue(1L)).thenReturn(Optional.empty());
        when(carImageRepository.findByCarId(1L)).thenReturn(List.of(image));

        String primary = carImageService.getPrimaryImageByCarId(1L);

        assertThat(primary).isEqualTo("test.jpg");
    }

    @Test
    void shouldGetPrimaryImageByCarId_fallbackNullWhenNoImages() {
        when(carImageRepository.findByCarIdAndIsPrimaryTrue(1L)).thenReturn(Optional.empty());
        when(carImageRepository.findByCarId(1L)).thenReturn(Collections.emptyList());

        String primary = carImageService.getPrimaryImageByCarId(1L);

        assertThat(primary).isNull();
    }

    @Test
    void shouldDeleteImage_successfully() {
        when(carImageRepository.existsById(10L)).thenReturn(true);

        MessageResponse response = carImageService.deleteImage(10L);

        assertThat(response.isSuccess()).isTrue();
        verify(carImageRepository).deleteById(10L);
    }

    @Test
    void shouldReturnError_whenDeleteImageNotFound() {
        when(carImageRepository.existsById(99L)).thenReturn(false);

        MessageResponse response = carImageService.deleteImage(99L);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Image non trouvée");
    }

    @Test
    void shouldSetPrimaryImage() {
        CarImage oldPrimary = new CarImage();
        oldPrimary.setId(8L);
        oldPrimary.setIsPrimary(true);

        image.setIsPrimary(false);

        when(carImageRepository.findById(10L)).thenReturn(Optional.of(image));
        when(carImageRepository.findByCarIdAndIsPrimaryTrue(1L)).thenReturn(Optional.of(oldPrimary));

        MessageResponse response = carImageService.setPrimaryImage(10L);

        assertThat(response.isSuccess()).isTrue();
        assertThat(oldPrimary.getIsPrimary()).isFalse();
        assertThat(image.getIsPrimary()).isTrue();
        verify(carImageRepository).save(oldPrimary);
        verify(carImageRepository).save(image);
    }

    @Test
    void shouldThrow_whenSetPrimaryImageNotFound() {
        when(carImageRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> carImageService.setPrimaryImage(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Image non trouvée");
    }
}
