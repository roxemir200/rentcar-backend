package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.service.CarImageService;
import com.rentcar.rent_car.service.storage.ImageStorage;
import com.rentcar.rent_car.service.storage.ImageStorageException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class CarImageController {

    private final CarImageService carImageService;

    /**
     * Destination des images. Le controleur ne connait ni chemin ni fournisseur :
     * il valide le fichier, le stockage decide ou il atterrit.
     */
    private final ImageStorage imageStorage;

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
            String safeBaseName = originalFilename.substring(0, lastDot).replaceAll("[^a-zA-Z0-9._-]", "_");
            String safeFilename = safeBaseName + extension;

            // ✅ 6. Générer un nom unique, pour qu'un même nom d'origine n'écrase rien
            String uniqueFilename = UUID.randomUUID() + "_" + safeFilename;

            // ✅ 7. Déléguer l'enregistrement au stockage configuré
            String imageUrl = imageStorage.store(file, uniqueFilename);
            return ResponseEntity.ok(MessageResponse.success("Image uploadée avec succès", imageUrl));

        } catch (ImageStorageException e) {
            // La cause exacte va dans les journaux ; le client reçoit un message neutre.
            log.error("Échec de l'enregistrement de l'image", e);
            return ResponseEntity.status(500)
                    .body(MessageResponse.error("Erreur lors de l'upload. Veuillez réessayer."));
        } catch (Exception e) {
            log.error("Erreur inattendue lors de l'upload de l'image", e);
            return ResponseEntity.badRequest()
                    .body(MessageResponse.error("Erreur lors de l'upload. Veuillez réessayer."));
        }
    }
}