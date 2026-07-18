package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.CarCategoryRequest;
import com.rentcar.rent_car.dto.response.CarCategoryResponse;
import com.rentcar.rent_car.entity.CarCategory;
import org.springframework.stereotype.Component;

@Component
public class CarCategoryMapper {

    public CarCategory toEntity(CarCategoryRequest request) {
        CarCategory category = new CarCategory();
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        return category;
    }

    public CarCategoryResponse toResponse(CarCategory category) {
        return CarCategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .createdAt(category.getCreatedAt())
                .build();
    }

    public void updateEntity(CarCategory category, CarCategoryRequest request) {
        category.setName(request.getName());
        category.setDescription(request.getDescription());
    }
}