package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.CarCategoryRequest;
import com.rentcar.rent_car.dto.response.CarCategoryResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.service.CarCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CarCategoryController {

    private final CarCategoryService categoryService;

    // Tout le monde peut voir les catégories
    @GetMapping
    public ResponseEntity<List<CarCategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CarCategoryResponse> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getCategoryById(id));
    }

    // Seul l'admin peut créer, modifier, supprimer
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> createCategory(@Valid @RequestBody CarCategoryRequest request) {
        MessageResponse response = categoryService.createCategory(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> updateCategory(@PathVariable Long id,
                                                          @Valid @RequestBody CarCategoryRequest request) {
        return ResponseEntity.ok(categoryService.updateCategory(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> deleteCategory(@PathVariable Long id) {
        MessageResponse response = categoryService.deleteCategory(id);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }
}