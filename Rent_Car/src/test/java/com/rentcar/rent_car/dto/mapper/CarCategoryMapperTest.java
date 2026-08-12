package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.CarCategoryRequest;
import com.rentcar.rent_car.dto.response.CarCategoryResponse;
import com.rentcar.rent_car.entity.CarCategory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class CarCategoryMapperTest {

    private CarCategoryMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new CarCategoryMapper();
    }

    @Test
    void shouldToEntity() {
        CarCategoryRequest request = new CarCategoryRequest();
        request.setName("SUV");
        request.setDescription("Sport Utility Vehicle");

        CarCategory category = mapper.toEntity(request);

        assertThat(category.getName()).isEqualTo("SUV");
        assertThat(category.getDescription()).isEqualTo("Sport Utility Vehicle");
    }

    @Test
    void shouldToResponse() {
        LocalDateTime now = LocalDateTime.now();
        CarCategory category = new CarCategory();
        category.setId(5L);
        category.setName("SUV");
        category.setDescription("Sport Utility Vehicle");
        category.setCreatedAt(now);

        CarCategoryResponse response = mapper.toResponse(category);

        assertThat(response.getId()).isEqualTo(5L);
        assertThat(response.getName()).isEqualTo("SUV");
        assertThat(response.getDescription()).isEqualTo("Sport Utility Vehicle");
        assertThat(response.getCreatedAt()).isEqualTo(now);
    }

    @Test
    void shouldUpdateEntity() {
        CarCategory category = new CarCategory();
        category.setName("Ancien");
        category.setDescription("Ancienne desc");

        CarCategoryRequest request = new CarCategoryRequest();
        request.setName("Nouveau");
        request.setDescription("Nouvelle desc");

        mapper.updateEntity(category, request);

        assertThat(category.getName()).isEqualTo("Nouveau");
        assertThat(category.getDescription()).isEqualTo("Nouvelle desc");
    }
}
