package com.rentcar.rent_car.service.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * Destination des images televersees.
 * <p>
 * Cette abstraction existe pour une raison concrete : le systeme de fichiers
 * d'un conteneur est <strong>ephemere</strong>. Tout fichier ecrit sur le
 * disque disparait au redeploiement suivant, ainsi qu'a chaque redemarrage
 * de l'instance. Les photos de voitures televersees depuis l'administration
 * s'evaporaient donc silencieusement.
 * <p>
 * Deux implementations, choisies par {@code app.storage.provider} :
 * <ul>
 *   <li>{@link LocalImageStorage} — disque local, adapte au poste de
 *       developpement ;</li>
 *   <li>{@link CloudinaryImageStorage} — stockage externe durable, servi
 *       par un CDN.</li>
 * </ul>
 */
public interface ImageStorage {

    /**
     * Enregistre une image et renvoie l'URL permettant de la servir.
     *
     * @param file     fichier deja valide par l'appelant (taille, type MIME, extension)
     * @param filename nom de fichier sur, sans composante de chemin
     * @return URL de l'image : absolue pour un stockage externe, relative en local
     * @throws ImageStorageException si l'enregistrement echoue
     */
    String store(MultipartFile file, String filename);
}
