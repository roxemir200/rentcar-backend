package com.rentcar.rent_car.service.impl;

import com.rentcar.rent_car.dto.mapper.CarCategoryMapper;
import com.rentcar.rent_car.dto.request.CarCategoryRequest;
import com.rentcar.rent_car.dto.response.CarCategoryResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.entity.CarCategory;
import com.rentcar.rent_car.repository.CarCategoryRepository;
import com.rentcar.rent_car.service.CarCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CarCategoryServiceImpl implements CarCategoryService {

    private final CarCategoryRepository categoryRepository;
    private final CarCategoryMapper categoryMapper;

    @Override
    public List<CarCategoryResponse> getAllCategories() {
        return categoryRepository.findAll()
                .stream()
                .map(categoryMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CarCategoryResponse getCategoryById(Long id) {
        CarCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée avec l'id : " + id));
        return categoryMapper.toResponse(category);
    }

    @Override
    public MessageResponse createCategory(CarCategoryRequest request) {
        if (categoryRepository.existsByName(request.getName())) {
            return MessageResponse.error("Cette catégorie existe déjà");
        }

        CarCategory category = categoryMapper.toEntity(request);
        categoryRepository.save(category);

        return MessageResponse.success("Catégorie créée avec succès", categoryMapper.toResponse(category));
    }

    @Override
    public MessageResponse updateCategory(Long id, CarCategoryRequest request) {
        CarCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée avec l'id : " + id));

        categoryMapper.updateEntity(category, request);
        categoryRepository.save(category);

        return MessageResponse.success("Catégorie mise à jour avec succès", categoryMapper.toResponse(category));
    }

    @Override
    public MessageResponse deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            return MessageResponse.error("Catégorie non trouvée avec l'id : " + id);
        }

        categoryRepository.deleteById(id);
        return MessageResponse.success("Catégorie supprimée avec succès");
    }
}