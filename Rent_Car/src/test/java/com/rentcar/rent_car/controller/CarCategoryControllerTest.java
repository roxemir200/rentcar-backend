package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.CarCategoryRequest;
import com.rentcar.rent_car.dto.response.CarCategoryResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.service.CarCategoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CarCategoryControllerTest {

    @Mock
    private CarCategoryService categoryService;

    @InjectMocks
    private CarCategoryController categoryController;

    @Test
    void shouldGetAllCategories() {
        when(categoryService.getAllCategories()).thenReturn(List.of(new CarCategoryResponse()));

        ResponseEntity<List<CarCategoryResponse>> response = categoryController.getAllCategories();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldGetCategoryById() {
        when(categoryService.getCategoryById(1L)).thenReturn(new CarCategoryResponse());

        ResponseEntity<CarCategoryResponse> response = categoryController.getCategoryById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldCreateCategory_whenSuccess() {
        when(categoryService.createCategory(any(CarCategoryRequest.class))).thenReturn(MessageResponse.success("Créée"));

        ResponseEntity<MessageResponse> response = categoryController.createCategory(new CarCategoryRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldCreateCategory_whenError() {
        when(categoryService.createCategory(any(CarCategoryRequest.class))).thenReturn(MessageResponse.error("Existe déjà"));

        ResponseEntity<MessageResponse> response = categoryController.createCategory(new CarCategoryRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldUpdateCategory() {
        when(categoryService.updateCategory(eq(1L), any(CarCategoryRequest.class))).thenReturn(MessageResponse.success("Mise à jour"));

        ResponseEntity<MessageResponse> response = categoryController.updateCategory(1L, new CarCategoryRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldDeleteCategory_whenSuccess() {
        when(categoryService.deleteCategory(1L)).thenReturn(MessageResponse.success("Supprimée"));

        ResponseEntity<MessageResponse> response = categoryController.deleteCategory(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldDeleteCategory_whenError() {
        when(categoryService.deleteCategory(1L)).thenReturn(MessageResponse.error("Voitures rattachées"));

        ResponseEntity<MessageResponse> response = categoryController.deleteCategory(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
