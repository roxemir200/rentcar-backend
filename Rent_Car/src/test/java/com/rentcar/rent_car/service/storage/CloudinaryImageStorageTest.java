package com.rentcar.rent_car.service.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CloudinaryImageStorageTest {

    private Cloudinary cloudinary;
    private Uploader uploader;

    @BeforeEach
    void setUp() {
        cloudinary = mock(Cloudinary.class);
        uploader = mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
    }

    private MockMultipartFile image() {
        return new MockMultipartFile("file", "car.png", "image/png", "des-octets".getBytes());
    }

    @Test
    void shouldReturnSecureUrlProvidedByCloudinary() throws IOException {
        when(uploader.upload(any(), any()))
                .thenReturn(Map.of("secure_url", "https://res.cloudinary.com/demo/rentcar/cars/abc.png"));
        CloudinaryImageStorage storage = new CloudinaryImageStorage(cloudinary);

        String url = storage.store(image(), "abc_car.png");

        assertThat(url).isEqualTo("https://res.cloudinary.com/demo/rentcar/cars/abc.png");
    }

    /** L'URL doit etre absolue : c'est ce qui rend le conteneur sans etat. */
    @Test
    void shouldReturnAbsoluteUrlNotServedByTheApplication() throws IOException {
        when(uploader.upload(any(), any()))
                .thenReturn(Map.of("secure_url", "https://res.cloudinary.com/demo/x.png"));
        CloudinaryImageStorage storage = new CloudinaryImageStorage(cloudinary);

        assertThat(storage.store(image(), "abc.png"))
                .startsWith("https://")
                .doesNotStartWith("/uploads");
    }

    @Test
    void shouldRaiseWhenCloudinaryReturnsNoUrl() throws IOException {
        when(uploader.upload(any(), any())).thenReturn(Map.of("public_id", "abc"));
        CloudinaryImageStorage storage = new CloudinaryImageStorage(cloudinary);

        assertThatThrownBy(() -> storage.store(image(), "abc.png"))
                .isInstanceOf(ImageStorageException.class);
    }

    @Test
    void shouldRaiseWhenUploadFails() throws IOException {
        when(uploader.upload(any(), any())).thenThrow(new IOException("reseau indisponible"));
        CloudinaryImageStorage storage = new CloudinaryImageStorage(cloudinary);

        assertThatThrownBy(() -> storage.store(image(), "abc.png"))
                .isInstanceOf(ImageStorageException.class)
                .hasMessageContaining("abc.png");
    }

    /**
     * Verifie que Spring sait construire ce bean quand Cloudinary est retenu,
     * et qu'une configuration incomplete echoue AU DEMARRAGE plutot qu'au
     * premier televersement.
     */
    @Test
    void shouldFailFastAtStartupWhenCloudinaryUrlIsMissing() {
        new ApplicationContextRunner()
                .withUserConfiguration(CloudinaryImageStorage.class)
                .withPropertyValues("app.storage.provider=cloudinary")
                .run(context -> assertThat(context)
                        .hasFailed()
                        .getFailure()
                        .rootCause()
                        .isInstanceOf(ImageStorageException.class)
                        .hasMessageContaining("CLOUDINARY_URL"));
    }

    @Test
    void shouldBeInstantiableBySpringWhenUrlIsProvided() {
        new ApplicationContextRunner()
                .withUserConfiguration(CloudinaryImageStorage.class)
                .withPropertyValues(
                        "app.storage.provider=cloudinary",
                        "app.storage.cloudinary.url=cloudinary://cle:secret@mon-compte")
                .run(context -> assertThat(context)
                        .hasNotFailed()
                        .hasSingleBean(CloudinaryImageStorage.class));
    }
}
