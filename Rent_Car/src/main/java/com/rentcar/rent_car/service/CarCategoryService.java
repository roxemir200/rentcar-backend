package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.request.CarCategoryRequest;
import com.rentcar.rent_car.dto.response.CarCategoryResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;

import java.util.List;

public interface CarCategoryService {

    List<CarCategoryResponse> getAllCategories();

    CarCategoryResponse getCategoryById(Long id);

    MessageResponse createCategory(CarCategoryRequest request);

    MessageResponse updateCategory(Long id, CarCategoryRequest request);

    MessageResponse deleteCategory(Long id);
}