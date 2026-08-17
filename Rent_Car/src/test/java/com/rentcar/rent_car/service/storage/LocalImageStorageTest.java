package com.rentcar.rent_car.service.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
