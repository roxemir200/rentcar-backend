package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.service.CarImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CarImageController {

    private final CarImageService carImageService;

    // Voir les images d'une voiture (PUBLIC)
    @GetMapping("/cars/{carId}/images")
    public ResponseEntity<List<String>> getImagesByCarId(@PathVariable Long carId) {
        return ResponseEntity.ok(carImageService.getImagesByCarId(carId));
    }

    // Voir l'image primaire d'une voiture (PUBLIC)
    @GetMapping("/cars/{carId}/primary-image")
    public ResponseEntity<String> getPrimaryImage(@PathVariable Long carId) {
        return ResponseEntity.ok(carImageService.getPrimaryImageByCarId(carId));
    }

    // Ajouter une image (ADMIN)
    @PostMapping("/admin/cars/{carId}/images")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> addImage(@PathVariable Long carId,
                                                    @RequestBody Map<String, String> body) {
        String imageUrl = body.get("imageUrl");
        boolean isPrimary = Boolean.parseBoolean(body.getOrDefault("isPrimary", "false"));

        MessageResponse response = carImageService.addImageToCar(carId, imageUrl, isPrimary);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }

    // Définir une image comme primaire (ADMIN)
    @PutMapping("/admin/images/{imageId}/set-primary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> setPrimaryImage(@PathVariable Long imageId) {
        return ResponseEntity.ok(carImageService.setPrimaryImage(imageId));
    }

    // Supprimer une image (ADMIN)
    @DeleteMapping("/admin/images/{imageId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> deleteImage(@PathVariable Long imageId) {
        MessageResponse response = carImageService.deleteImage(imageId);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }
}