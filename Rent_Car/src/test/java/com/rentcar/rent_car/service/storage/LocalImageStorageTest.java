package com.rentcar.rent_car.service.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

class LocalImageStorageTest {

    @TempDir
    Path tempDir;

    private MockMultipartFile image() {
        return new MockMultipartFile("file", "car.png", "image/png", "des-octets".getBytes());
    }

    @Test
    void shouldWriteFileAndReturnRelativeUrl() {
        LocalImageStorage storage = new LocalImageStorage(tempDir.toString());

        String url = storage.store(image(), "abc_car.png");

        assertThat(url).isEqualTo("/uploads/cars/abc_car.png");
        assertThat(Files.exists(tempDir.resolve("cars").resolve("abc_car.png"))).isTrue();
    }

    @Test
    void shouldCreateMissingDirectories() {
        LocalImageStorage storage = new LocalImageStorage(tempDir.resolve("inexistant").toString());

        storage.store(image(), "abc_car.png");

        assertThat(Files.isDirectory(tempDir.resolve("inexistant").resolve("cars"))).isTrue();
    }

    /** Un nom contenant une remontee de repertoire ne doit rien ecrire hors du dossier. */
    @Test
    void shouldRejectPathTraversalAttempt() {
        LocalImageStorage storage = new LocalImageStorage(tempDir.toString());

        assertThatThrownBy(() -> storage.store(image(), "../../evade.png"))
                .isInstanceOf(ImageStorageException.class);
    }

    @Test
    void shouldRejectDuplicateFilename() {
        LocalImageStorage storage = new LocalImageStorage(tempDir.toString());
        storage.store(image(), "abc_car.png");

        assertThatThrownBy(() -> storage.store(image(), "abc_car.png"))
                .isInstanceOf(ImageStorageException.class);
    }

    /**
     * Un fichier de taille nulle sur le disque ne doit pas produire une URL :
     * la fiche vehicule afficherait une image cassee, sans que rien ne signale
     * ou l'enregistrement a echoue.
     */
    @Test
    void shouldRejectAFileThatLandsEmptyOnDisk() {
        LocalImageStorage storage = new LocalImageStorage(tempDir.toString());
        MockMultipartFile vide = new MockMultipartFile("file", "car.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> storage.store(vide, "abc_car.png"))
                .isInstanceOf(ImageStorageException.class)
                .hasMessageContaining("vide");
    }

    /**
     * Panne d'ecriture — disque plein, droits insuffisants. L'appelant ne
     * connait que {@link ImageStorageException} : c'est ce qui permet au
     * controleur de traiter de la meme facon un echec local et un echec
     * Cloudinary.
     */
    @Test
    void shouldTranslateWriteFailuresIntoStorageException() throws Exception {
        LocalImageStorage storage = new LocalImageStorage(tempDir.toString());
        MultipartFile file = mock(MultipartFile.class);
        doThrow(new IOException("disque plein")).when(file).transferTo(any(File.class));

        assertThatThrownBy(() -> storage.store(file, "abc_car.png"))
                .isInstanceOf(ImageStorageException.class)
                .hasMessageContaining("abc_car.png")
                .hasCauseInstanceOf(IOException.class);
    }

    /** Verifie que Spring sait construire ce bean, et seulement quand il est retenu. */
    @Test
    void shouldBeSelectedByDefaultAndOnlyForLocalProvider() {
        new ApplicationContextRunner()
                .withUserConfiguration(LocalImageStorage.class)
                .run(context -> assertThat(context)
                        .hasNotFailed()
                        .hasSingleBean(LocalImageStorage.class));

        new ApplicationContextRunner()
                .withUserConfiguration(LocalImageStorage.class)
                .withPropertyValues("app.storage.provider=cloudinary")
                .run(context -> assertThat(context).doesNotHaveBean(LocalImageStorage.class));
    }
}
