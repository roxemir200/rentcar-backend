package com.rentcar.rent_car.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * Racine des fichiers televerses, pilotee par {@code app.upload.dir}.
     * <p>
     * Le chemin etait auparavant fige sur {@code user.dir}, ce qui empechait
     * de le deplacer vers un volume persistant en production. La valeur
     * d'initialisation garde la classe utilisable hors contexte Spring.
     */
    @Value("${app.upload.dir:uploads}")
    private String uploadDir = "uploads";

    /**
     * Resout le repertoire en chemin absolu normalise. Un chemin relatif reste
     * interprete depuis le repertoire de travail, comme avant.
     */
    private Path resolveUploadPath() {
        return Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(resolveUploadPath().toUri().toString());
    }
}
