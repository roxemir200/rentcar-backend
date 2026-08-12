package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.CarCategory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CarCategoryRepositoryTest {

    @Mock
    private CarCategoryRepository categoryRepository;

    private CarCategory category;

    @BeforeEach
    void setUp() {
        category = new CarCategory();
        category.setId(1L);
        category.setName("LUXE");
        category.setDescription("Voitures de luxe");
    }

    @Test
    void shouldFindByName() {
        when(categoryRepository.findByName("LUXE")).thenReturn(Optional.of(category));

        Optional<CarCategory> found = categoryRepository.findByName("LUXE");

        assertThat(found).isPresent();
        assertThat(found.get().getDescription()).isEqualTo("Voitures de luxe");
    }

    @Test
    void shouldExistsByName() {
        when(categoryRepository.existsByName("LUXE")).thenReturn(true);

        Boolean exists = categoryRepository.existsByName("LUXE");

        assertThat(exists).isTrue();
    }
}
