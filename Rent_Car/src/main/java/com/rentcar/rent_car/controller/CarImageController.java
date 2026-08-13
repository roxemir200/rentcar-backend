package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.service.CarImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CarImageController {

    private final CarImageService carImageService;

    // ✅ Taille max : 5MB (5 * 1024 * 1024 octets)
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;

    // ✅ Types MIME autorisés
    private static final List<String> ALLOWED_MIME_TYPES = Arrays.asList(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/bmp"
    );

    // ✅ Extensions autorisées
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"
    );

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

    @PostMapping("/admin/upload-image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            // ✅ 1. Vérifier que le fichier n'est pas null ou vide
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(MessageResponse.error("Le fichier est vide ou null"));
            }

            // ✅ 2. Vérifier que le fichier n'est pas trop volumineux
            if (file.getSize() > MAX_FILE_SIZE) {
                return ResponseEntity.badRequest()
                        .body(MessageResponse.error("Le fichier dépasse la taille maximale autorisée (5MB)"));
            }

            // ✅ 3. Vérifier le type MIME du fichier
            String mimeType = file.getContentType();
            if (mimeType == null || !ALLOWED_MIME_TYPES.contains(mimeType)) {
                return ResponseEntity.badRequest()
                        .body(MessageResponse.error("Type de fichier non autorisé. Formats acceptés : JPEG, PNG, GIF, WEBP, BMP"));
            }

            // ✅ 4. Vérifier l'extension du fichier
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || originalFilename.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(MessageResponse.error("Nom de fichier invalide"));
            }

            // Extraire l'extension
            String extension = "";
            int lastDot = originalFilename.lastIndexOf('.');
            if (lastDot > 0 && lastDot < originalFilename.length() - 1) {
                extension = originalFilename.substring(lastDot).toLowerCase();
            }

            if (extension.isEmpty() || !ALLOWED_EXTENSIONS.contains(extension)) {
                return ResponseEntity.badRequest()
                        .body(MessageResponse.error("Extension de fichier non autorisée. Extensions acceptées : .jpg, .jpeg, .png, .gif, .webp, .bmp"));
            }

            // ✅ 5. Nettoyer le nom du fichier (éviter les attaques path traversal)
            // Supprimer les caractères dangereux
            String safeBaseName = originalFilename.substring(0, lastDot).replaceAll("[^a-zA-Z0-9._-]", "_");
            String safeFilename = safeBaseName + extension;

            // ✅ 6. Définir le dossier d'upload sécurisé
            String uploadDir = System.getProperty("user.dir") + "/uploads/cars/";
            Path uploadPath = Paths.get(uploadDir);

            // ✅ 7. Créer le dossier s'il n'existe pas avec les permissions appropriées
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // ✅ 8. Générer un nom unique (UUID + nom sécurisé)
            String uniqueFilename = UUID.randomUUID().toString() + "_" + safeFilename;
            Path targetPath = uploadPath.resolve(uniqueFilename).normalize();

            // ✅ 9. Vérifier que le chemin reste dans le dossier d'upload (protection path traversal)
            if (!targetPath.startsWith(uploadPath)) {
                return ResponseEntity.badRequest()
                        .body(MessageResponse.error("Chemin de fichier invalide"));
            }

            // ✅ 10. Vérifier que le fichier n'existe pas déjà
            if (Files.exists(targetPath)) {
                return ResponseEntity.badRequest()
                        .body(MessageResponse.error("Un fichier avec ce nom existe déjà"));
            }

            // ✅ 11. Sauvegarder le fichier
            file.transferTo(targetPath.toFile());

            // ✅ 12. Vérifier que le fichier a bien été sauvegardé
            if (!Files.exists(targetPath) || Files.size(targetPath) == 0) {
                return ResponseEntity.status(500)
                        .body(MessageResponse.error("Erreur lors de la sauvegarde du fichier"));
            }

            // Retourner l'URL
            String imageUrl = "/uploads/cars/" + uniqueFilename;
            return ResponseEntity.ok(MessageResponse.success("Image uploadée avec succès", imageUrl));

        } catch (Exception e) {
            // ✅ 13. Log l'erreur sans exposer les détails internes
            System.err.println("Erreur lors de l'upload de l'image: " + e.getMessage());
            return ResponseEntity.badRequest()
                    .body(MessageResponse.error("Erreur lors de l'upload. Veuillez réessayer."));
        }
    }
}