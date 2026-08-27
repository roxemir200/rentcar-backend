package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.service.CarImageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.rentcar.rent_car.service.storage.ImageStorage;
import com.rentcar.rent_car.service.storage.ImageStorageException;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CarImageControllerTest {

    @Mock
    private CarImageService carImageService;

    @Mock
    private ImageStorage imageStorage;

    @InjectMocks
    private CarImageController carImageController;

    @Test
    void shouldGetImagesByCarId() {
        when(carImageService.getImagesByCarId(1L)).thenReturn(List.of("img1.jpg"));

        ResponseEntity<List<String>> response = carImageController.getImagesByCarId(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsExactly("img1.jpg");
    }

    @Test
    void shouldGetPrimaryImage() {
        when(carImageService.getPrimaryImageByCarId(1L)).thenReturn("primary.jpg");

        ResponseEntity<String> response = carImageController.getPrimaryImage(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo("primary.jpg");
    }

    @Test
    void shouldAddImage_whenSuccess() {
        when(carImageService.addImageToCar(eq(1L), eq("new.jpg"), eq(true)))
                .thenReturn(MessageResponse.success("Ajoutée"));

        ResponseEntity<MessageResponse> response = carImageController.addImage(
                1L, Map.of("imageUrl", "new.jpg", "isPrimary", "true")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldAddImage_whenError() {
        when(carImageService.addImageToCar(eq(1L), eq("new.jpg"), eq(false)))
                .thenReturn(MessageResponse.error("Erreur"));

        ResponseEntity<MessageResponse> response = carImageController.addImage(
                1L, Map.of("imageUrl", "new.jpg")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldSetPrimaryImage() {
        when(carImageService.setPrimaryImage(10L)).thenReturn(MessageResponse.success("Définie"));

        ResponseEntity<MessageResponse> response = carImageController.setPrimaryImage(10L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldDeleteImage_whenSuccess() {
        when(carImageService.deleteImage(10L)).thenReturn(MessageResponse.success("Supprimée"));

        ResponseEntity<MessageResponse> response = carImageController.deleteImage(10L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldDeleteImage_whenError() {
        when(carImageService.deleteImage(10L)).thenReturn(MessageResponse.error("Introuvable"));

        ResponseEntity<MessageResponse> response = carImageController.deleteImage(10L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldUploadImage() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "car.png", "image/png", "dummy-bytes".getBytes()
        );
        when(imageStorage.store(any(), anyString()))
                .thenReturn("https://res.cloudinary.com/demo/image/upload/rentcar/cars/abc.png");

        ResponseEntity<MessageResponse> response = carImageController.uploadImage(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().isSuccess()).isTrue();
    }

    /**
     * Le controleur genere un nom unique : deux televersements du meme fichier
     * ne doivent pas se recouvrir dans le stockage.
     */
    @Test
    void shouldGenerateUniqueFilenamePreservingExtension() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "ma photo.PNG", "image/png", "dummy-bytes".getBytes()
        );
        when(imageStorage.store(any(), anyString())).thenReturn("/uploads/cars/x.png");

        carImageController.uploadImage(file);

        ArgumentCaptor<String> name = ArgumentCaptor.forClass(String.class);
        verify(imageStorage).store(any(), name.capture());
        assertThat(name.getValue()).endsWith(".png").contains("ma_photo");
    }

    /** Une extension non autorisee ne doit jamais atteindre le stockage. */
    @Test
    void shouldRejectDisallowedExtensionWithoutTouchingStorage() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "script.svg", "image/png", "dummy".getBytes()
        );

        ResponseEntity<MessageResponse> response = carImageController.uploadImage(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(imageStorage);
    }

    /** Un echec de stockage est un probleme serveur, pas une requete invalide. */
    @Test
    void shouldReturnServerErrorWhenStorageFails() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "car.png", "image/png", "dummy-bytes".getBytes()
        );
        when(imageStorage.store(any(), anyString()))
                .thenThrow(new ImageStorageException("Cloudinary indisponible"));

        ResponseEntity<MessageResponse> response = carImageController.uploadImage(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Les controles d'entree du televersement.
     * <p>
     * Ce point d'entree accepte un fichier arbitraire : c'est la surface
     * d'attaque la plus large de l'API. Chaque refus est verifie
     * individuellement, et surtout : aucun d'eux ne doit atteindre le stockage.
     */
    @Test
    void shouldRejectMissingFile() {
        ResponseEntity<MessageResponse> response = carImageController.uploadImage(null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(imageStorage);
    }

    @Test
    void shouldRejectEmptyFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "car.png", "image/png", new byte[0]
        );

        ResponseEntity<MessageResponse> response = carImageController.uploadImage(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getMessage()).contains("vide");
        verifyNoInteractions(imageStorage);
    }

    /**
     * Au-dela de 5 Mo, le fichier est refuse avant toute lecture : le simuler
     * evite d'allouer reellement les octets pour le verifier.
     */
    @Test
    void shouldRejectOversizedFile() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(6L * 1024 * 1024);

        ResponseEntity<MessageResponse> response = carImageController.uploadImage(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getMessage()).contains("5MB");
        verifyNoInteractions(imageStorage);
    }

    @Test
    void shouldRejectDisallowedMimeType() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "facture.pdf", "application/pdf", "%PDF-1.4".getBytes()
        );

        ResponseEntity<MessageResponse> response = carImageController.uploadImage(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getMessage()).contains("Type de fichier non autorisé");
        verifyNoInteractions(imageStorage);
    }

    /** Sans type declare, on ne peut rien affirmer du contenu : on refuse. */
    @Test
    void shouldRejectFileWithoutDeclaredMimeType() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "car.png", null, "des-octets".getBytes()
        );

        ResponseEntity<MessageResponse> response = carImageController.uploadImage(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(imageStorage);
    }

    @Test
    void shouldRejectFileWithoutName() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "", "image/png", "des-octets".getBytes()
        );

        ResponseEntity<MessageResponse> response = carImageController.uploadImage(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getMessage()).contains("Nom de fichier invalide");
        verifyNoInteractions(imageStorage);
    }

    /**
     * Toute autre defaillance reste generique cote client : le detail de
     * l'erreur va dans les journaux, jamais dans la reponse HTTP, qui
     * renseignerait un attaquant sur l'infrastructure de stockage.
     */
    @Test
    void shouldReturnNeutralMessageOnUnexpectedError() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "car.png", "image/png", "des-octets".getBytes()
        );
        when(imageStorage.store(any(), anyString()))
                .thenThrow(new IllegalStateException("jeton Cloudinary expiré"));

        ResponseEntity<MessageResponse> response = carImageController.uploadImage(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getMessage())
                .isEqualTo("Erreur lors de l'upload. Veuillez réessayer.")
                .doesNotContain("Cloudinary");
    }
}
