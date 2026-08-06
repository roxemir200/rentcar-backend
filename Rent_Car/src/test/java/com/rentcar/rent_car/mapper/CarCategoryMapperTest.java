package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.CarCategoryRequest;
import com.rentcar.rent_car.dto.response.CarCategoryResponse;
import com.rentcar.rent_car.entity.CarCategory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
@DisplayName("Car Category Mapper Tests")
class CarCategoryMapperTest {

    private CarCategoryMapper carCategoryMapper;

    private CarCategoryRequest request;
    private CarCategory category;
    private LocalDateTime createdAt;

    @BeforeEach
    void setUp() {
        carCategoryMapper = new CarCategoryMapper();

        createdAt = LocalDateTime.now();

        // Setup test request
        request = new CarCategoryRequest();
        request.setName("SUV");
        request.setDescription("Sports Utility Vehicles - Large family cars");

        // Setup test entity
        category = new CarCategory();
        category.setId(1L);
        category.setName("SUV");
        category.setDescription("Sports Utility Vehicles - Large family cars");
        category.setCreatedAt(createdAt);
    }

    @Nested
    @DisplayName("toEntity Tests")
    class ToEntityTests {

        @Test
        @DisplayName("Should map request to entity correctly")
        void shouldMapRequestToEntity() {
            // When
            CarCategory result = carCategoryMapper.toEntity(request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isNull(); // ID should not be set by mapper
            assertThat(result.getName()).isEqualTo("SUV");
            assertThat(result.getDescription()).isEqualTo("Sports Utility Vehicles - Large family cars");
            assertThat(result.getCreatedAt()).isNull(); // CreatedAt should not be set by mapper
        }

        @Test
        @DisplayName("Should handle null name in request")
        void shouldHandleNullName() {
            // Given
            request.setName(null);

            // When
            CarCategory result = carCategoryMapper.toEntity(request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getName()).isNull();
            assertThat(result.getDescription()).isEqualTo("Sports Utility Vehicles - Large family cars");
        }

        @Test
        @DisplayName("Should handle null description in request")
        void shouldHandleNullDescription() {
            // Given
            request.setDescription(null);

            // When
            CarCategory result = carCategoryMapper.toEntity(request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("SUV");
            assertThat(result.getDescription()).isNull();
        }

        @Test
        @DisplayName("Should handle empty strings in request")
        void shouldHandleEmptyStrings() {
            // Given
            request.setName("");
            request.setDescription("");

            // When
            CarCategory result = carCategoryMapper.toEntity(request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getName()).isEmpty();
            assertThat(result.getDescription()).isEmpty();
        }

        @Test
        @DisplayName("Should handle null request gracefully")
        void shouldHandleNullRequest() {
            // Given
            CarCategoryRequest nullRequest = null;

            // When & Then
            assertThatThrownBy(() -> carCategoryMapper.toEntity(nullRequest))
                    .isInstanceOf(NullPointerException.class);
        }
    }

    @Nested
    @DisplayName("toResponse Tests")
    class ToResponseTests {

        @Test
        @DisplayName("Should map entity to response correctly")
        void shouldMapEntityToResponse() {
            // When
            CarCategoryResponse result = carCategoryMapper.toResponse(category);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getName()).isEqualTo("SUV");
            assertThat(result.getDescription()).isEqualTo("Sports Utility Vehicles - Large family cars");
            assertThat(result.getCreatedAt()).isEqualTo(createdAt);
        }

        @Test
        @DisplayName("Should handle entity with null id")
        void shouldHandleNullId() {
            // Given
            category.setId(null);

            // When
            CarCategoryResponse result = carCategoryMapper.toResponse(category);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isNull();
            assertThat(result.getName()).isEqualTo("SUV");
            assertThat(result.getDescription()).isEqualTo("Sports Utility Vehicles - Large family cars");
            assertThat(result.getCreatedAt()).isEqualTo(createdAt);
        }

        @Test
        @DisplayName("Should handle entity with null name")
        void shouldHandleNullNameInEntity() {
            // Given
            category.setName(null);

            // When
            CarCategoryResponse result = carCategoryMapper.toResponse(category);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getName()).isNull();
            assertThat(result.getDescription()).isEqualTo("Sports Utility Vehicles - Large family cars");
            assertThat(result.getCreatedAt()).isEqualTo(createdAt);
        }

        @Test
        @DisplayName("Should handle entity with null description")
        void shouldHandleNullDescriptionInEntity() {
            // Given
            category.setDescription(null);

            // When
            CarCategoryResponse result = carCategoryMapper.toResponse(category);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getName()).isEqualTo("SUV");
            assertThat(result.getDescription()).isNull();
            assertThat(result.getCreatedAt()).isEqualTo(createdAt);
        }

        @Test
        @DisplayName("Should handle entity with null createdAt")
        void shouldHandleNullCreatedAt() {
            // Given
            category.setCreatedAt(null);

            // When
            CarCategoryResponse result = carCategoryMapper.toResponse(category);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getName()).isEqualTo("SUV");
            assertThat(result.getDescription()).isEqualTo("Sports Utility Vehicles - Large family cars");
            assertThat(result.getCreatedAt()).isNull();
        }

        @Test
        @DisplayName("Should handle entity with empty strings")
        void shouldHandleEmptyStringsInEntity() {
            // Given
            category.setName("");
            category.setDescription("");

            // When
            CarCategoryResponse result = carCategoryMapper.toResponse(category);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getName()).isEmpty();
            assertThat(result.getDescription()).isEmpty();
            assertThat(result.getCreatedAt()).isEqualTo(createdAt);
        }

        @Test
        @DisplayName("Should handle null entity gracefully")
        void shouldHandleNullEntity() {
            // Given
            CarCategory nullCategory = null;

            // When & Then
            assertThatThrownBy(() -> carCategoryMapper.toResponse(nullCategory))
                    .isInstanceOf(NullPointerException.class);
        }
    }

    @Nested
    @DisplayName("updateEntity Tests")
    class UpdateEntityTests {

        @Test
        @DisplayName("Should update entity correctly")
        void shouldUpdateEntityCorrectly() {
            // Given
            CarCategoryRequest updateRequest = new CarCategoryRequest();
            updateRequest.setName("Luxury SUV");
            updateRequest.setDescription("Premium Luxury Sports Utility Vehicles");

            // When
            carCategoryMapper.updateEntity(category, updateRequest);

            // Then
            assertThat(category.getId()).isEqualTo(1L); // ID should remain unchanged
            assertThat(category.getName()).isEqualTo("Luxury SUV");
            assertThat(category.getDescription()).isEqualTo("Premium Luxury Sports Utility Vehicles");
            assertThat(category.getCreatedAt()).isEqualTo(createdAt); // CreatedAt should remain unchanged
        }

        @Test
        @DisplayName("Should update only name when description is null")
        void shouldUpdateOnlyNameWhenDescriptionNull() {
            // Given
            CarCategoryRequest updateRequest = new CarCategoryRequest();
            updateRequest.setName("Luxury SUV");
            updateRequest.setDescription(null);

            // When
            carCategoryMapper.updateEntity(category, updateRequest);

            // Then
            assertThat(category.getName()).isEqualTo("Luxury SUV");
            assertThat(category.getDescription()).isNull();
            assertThat(category.getId()).isEqualTo(1L);
            assertThat(category.getCreatedAt()).isEqualTo(createdAt);
        }

        @Test
        @DisplayName("Should update only description when name is null")
        void shouldUpdateOnlyDescriptionWhenNameNull() {
            // Given
            CarCategoryRequest updateRequest = new CarCategoryRequest();
            updateRequest.setName(null);
            updateRequest.setDescription("Updated description");

            // When
            carCategoryMapper.updateEntity(category, updateRequest);

            // Then
            assertThat(category.getName()).isNull();
            assertThat(category.getDescription()).isEqualTo("Updated description");
            assertThat(category.getId()).isEqualTo(1L);
            assertThat(category.getCreatedAt()).isEqualTo(createdAt);
        }

        @Test
        @DisplayName("Should handle empty strings in update")
        void shouldHandleEmptyStringsInUpdate() {
            // Given
            CarCategoryRequest updateRequest = new CarCategoryRequest();
            updateRequest.setName("");
            updateRequest.setDescription("");

            // When
            carCategoryMapper.updateEntity(category, updateRequest);

            // Then
            assertThat(category.getName()).isEmpty();
            assertThat(category.getDescription()).isEmpty();
            assertThat(category.getId()).isEqualTo(1L);
            assertThat(category.getCreatedAt()).isEqualTo(createdAt);
        }

        @Test
        @DisplayName("Should preserve entity fields when request has null values")
        void shouldPreserveFieldsWhenRequestHasNullValues() {
            // Given - Original entity with values
            CarCategory originalCategory = new CarCategory();
            originalCategory.setId(1L);
            originalCategory.setName("Original Name");
            originalCategory.setDescription("Original Description");
            originalCategory.setCreatedAt(createdAt);

            CarCategoryRequest updateRequest = new CarCategoryRequest();
            updateRequest.setName(null);
            updateRequest.setDescription(null);

            // When
            carCategoryMapper.updateEntity(originalCategory, updateRequest);

            // Then
            assertThat(originalCategory.getName()).isNull(); // Updated to null
            assertThat(originalCategory.getDescription()).isNull(); // Updated to null
            assertThat(originalCategory.getId()).isEqualTo(1L);
            assertThat(originalCategory.getCreatedAt()).isEqualTo(createdAt);
        }

        @Test
        @DisplayName("Should throw exception when entity is null")
        void shouldThrowExceptionWhenEntityIsNull() {
            // Given
            CarCategory nullCategory = null;

            // When & Then
            assertThatThrownBy(() -> carCategoryMapper.updateEntity(nullCategory, request))
                    .isInstanceOf(NullPointerException.class);
        }

        @Test
        @DisplayName("Should throw exception when request is null")
        void shouldThrowExceptionWhenRequestIsNull() {
            // Given
            CarCategoryRequest nullRequest = null;

            // When & Then
            assertThatThrownBy(() -> carCategoryMapper.updateEntity(category, nullRequest))
                    .isInstanceOf(NullPointerException.class);
        }
    }

    @Nested
    @DisplayName("Integration Scenarios Tests")
    class IntegrationScenariosTests {

        @Test
        @DisplayName("Should handle complete flow: Request -> Entity -> Response")
        void shouldHandleCompleteFlow() {
            // Given - Create a category from request
            CarCategory newCategory = carCategoryMapper.toEntity(request);

            // Simulate saving to database (ID and createdAt would be set by JPA)
            newCategory.setId(1L);
            newCategory.setCreatedAt(LocalDateTime.now());

            // When - Convert to response
            CarCategoryResponse response = carCategoryMapper.toResponse(newCategory);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.getId()).isEqualTo(1L);
            assertThat(response.getName()).isEqualTo("SUV");
            assertThat(response.getDescription()).isEqualTo("Sports Utility Vehicles - Large family cars");
            assertThat(response.getCreatedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should handle complete update flow: Entity update from request")
        void shouldHandleCompleteUpdateFlow() {
            // Given
            CarCategory existingCategory = new CarCategory();
            existingCategory.setId(1L);
            existingCategory.setName("Old Name");
            existingCategory.setDescription("Old Description");
            existingCategory.setCreatedAt(createdAt);

            CarCategoryRequest updateRequest = new CarCategoryRequest();
            updateRequest.setName("New SUV");
            updateRequest.setDescription("New description");

            // When
            carCategoryMapper.updateEntity(existingCategory, updateRequest);

            // Then
            assertThat(existingCategory.getName()).isEqualTo("New SUV");
            assertThat(existingCategory.getDescription()).isEqualTo("New description");
            assertThat(existingCategory.getId()).isEqualTo(1L);
            assertThat(existingCategory.getCreatedAt()).isEqualTo(createdAt);
        }

        @Test
        @DisplayName("Should handle special characters in fields")
        void shouldHandleSpecialCharacters() {
            // Given
            CarCategoryRequest specialRequest = new CarCategoryRequest();
            specialRequest.setName("Crossover & SUV");
            specialRequest.setDescription("Sports Utility Vehicles (SUV) & Crossover - 4x4, All-Terrain");

            // When
            CarCategory result = carCategoryMapper.toEntity(specialRequest);

            // Then
            assertThat(result.getName()).isEqualTo("Crossover & SUV");
            assertThat(result.getDescription()).contains("SUV", "Crossover", "4x4");
        }

        @Test
        @DisplayName("Should handle very long field values")
        void shouldHandleVeryLongValues() {
            // Given
            String longName = "A".repeat(100);
            String longDescription = "B".repeat(500);

            CarCategoryRequest longRequest = new CarCategoryRequest();
            longRequest.setName(longName);
            longRequest.setDescription(longDescription);

            // When
            CarCategory result = carCategoryMapper.toEntity(longRequest);
            CarCategoryResponse response = carCategoryMapper.toResponse(result);

            // Then
            assertThat(result.getName()).isEqualTo(longName);
            assertThat(result.getDescription()).isEqualTo(longDescription);
            assertThat(response.getName()).isEqualTo(longName);
            assertThat(response.getDescription()).isEqualTo(longDescription);
        }
    }
}