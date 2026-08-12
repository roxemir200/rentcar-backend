package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.mapper.CarCategoryMapper;
import com.rentcar.rent_car.dto.request.CarCategoryRequest;
import com.rentcar.rent_car.dto.response.CarCategoryResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarCategory;
import com.rentcar.rent_car.repository.CarCategoryRepository;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.service.imp.CarCategoryServiceImpl;
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
class CarCategoryServiceTest {

    @Mock
    private CarCategoryRepository categoryRepository;

    @Mock
    private CarCategoryMapper categoryMapper;

    @Mock
    private CarRepository carRepository;

    @InjectMocks
    private CarCategoryServiceImpl categoryService;

    private CarCategory category;
    private CarCategoryRequest request;
    private CarCategoryResponse response;

    @BeforeEach
    void setUp() {
        category = new CarCategory();
        category.setId(1L);
        category.setName("Berline");

        request = new CarCategoryRequest();
        request.setName("Berline");

        response = new CarCategoryResponse();
        response.setId(1L);
        response.setName("Berline");
    }

    @Test
    void shouldGetAllCategories() {
        when(categoryRepository.findAll()).thenReturn(List.of(category));
        when(categoryMapper.toResponse(category)).thenReturn(response);

        List<CarCategoryResponse> result = categoryService.getAllCategories();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Berline");
    }

    @Test
    void shouldGetCategoryById_whenExists() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryMapper.toResponse(category)).thenReturn(response);

        CarCategoryResponse result = categoryService.getCategoryById(1L);

        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    void shouldThrow_whenGetCategoryByIdNotFound() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.getCategoryById(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Catégorie non trouvée");
    }

    @Test
    void shouldCreateCategory_successfully() {
        when(categoryRepository.existsByName("Berline")).thenReturn(false);
        when(categoryMapper.toEntity(request)).thenReturn(category);
        when(categoryRepository.save(any(CarCategory.class))).thenReturn(category);
        when(categoryMapper.toResponse(category)).thenReturn(response);

        MessageResponse result = categoryService.createCategory(request);

        assertThat(result.isSuccess()).isTrue();
        verify(categoryRepository).save(category);
    }

    @Test
    void shouldReturnError_whenCreatingExistingCategory() {
        when(categoryRepository.existsByName("Berline")).thenReturn(true);

        MessageResponse result = categoryService.createCategory(request);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("existe déjà");
    }

    @Test
    void shouldUpdateCategory_successfully() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        doNothing().when(categoryMapper).updateEntity(category, request);
        when(categoryRepository.save(category)).thenReturn(category);
        when(categoryMapper.toResponse(category)).thenReturn(response);

        MessageResponse result = categoryService.updateCategory(1L, request);

        assertThat(result.isSuccess()).isTrue();
        verify(categoryRepository).save(category);
    }

    @Test
    void shouldThrow_whenUpdatingNotFoundCategory() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.updateCategory(99L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Catégorie non trouvée");
    }

    @Test
    void shouldReturnError_whenDeletingCategoryNotFound() {
        when(categoryRepository.existsById(99L)).thenReturn(false);

        MessageResponse result = categoryService.deleteCategory(99L);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("non trouvée");
    }

    @Test
    void shouldReturnError_whenDeletingCategoryWithAssociatedCars() {
        when(categoryRepository.existsById(1L)).thenReturn(true);
        when(carRepository.findByCategoryId(1L)).thenReturn(List.of(new Car()));

        MessageResponse result = categoryService.deleteCategory(1L);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("Impossible de supprimer");
    }

    @Test
    void shouldDeleteCategory_successfully() {
        when(categoryRepository.existsById(1L)).thenReturn(true);
        when(carRepository.findByCategoryId(1L)).thenReturn(Collections.emptyList());

        MessageResponse result = categoryService.deleteCategory(1L);

        assertThat(result.isSuccess()).isTrue();
        verify(categoryRepository).deleteById(1L);
    }
}
