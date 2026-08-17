package com.rentcar.rent_car.service.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Enregistrement sur le disque local.
 * <p>
 * Stockage par defaut, adapte au poste de developpement. En production
 * conteneurisee, lui preferer {@link CloudinaryImageStorage} : le disque
 * est reinitialise a chaque deploiement.
 */
@Component
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
@Slf4j
public class LocalImageStorage implements ImageStorage {

    /** Sous-dossier des photos de voitures, sous {@code app.upload.dir}. */
    private static final String CARS_SUBFOLDER = "cars";

    private final String uploadDir;

    public LocalImageStorage(@Value("${app.upload.dir:uploads}") String uploadDir) {
        this.uploadDir = uploadDir;
    }

    @Override
    public String store(MultipartFile file, String filename) {
        try {
            Path uploadPath = Paths.get(uploadDir, CARS_SUBFOLDER).toAbsolutePath().normalize();

            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            Path targetPath = uploadPath.resolve(filename).normalize();

            // Protection contre la traversee de repertoire : un nom de fichier
            // contenant "../" resoudrait en dehors du dossier d'upload.
            if (!targetPath.startsWith(uploadPath)) {
                throw new ImageStorageException("Chemin de fichier invalide : " + filename);
            }

            if (Files.exists(targetPath)) {
                throw new ImageStorageException("Un fichier porte deja ce nom : " + filename);
            }

            file.transferTo(targetPath.toFile());

            if (!Files.exists(targetPath) || Files.size(targetPath) == 0) {
                throw new ImageStorageException("Le fichier enregistre est vide : " + filename);
            }

            log.debug("Image enregistree sur le disque local : {}", targetPath);
            return "/uploads/" + CARS_SUBFOLDER + "/" + filename;

        } catch (IOException e) {
            throw new ImageStorageException("Enregistrement local impossible : " + filename, e);
        }
    }
}
