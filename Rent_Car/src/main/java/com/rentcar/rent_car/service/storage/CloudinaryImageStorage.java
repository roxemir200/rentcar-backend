package com.rentcar.rent_car.service.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Enregistrement sur Cloudinary.
 * <p>
 * Rend le conteneur reellement sans etat : les images ne dependent plus de
 * son disque, et survivent donc aux redeploiements comme aux redemarrages.
 * Cloudinary sert ensuite les fichiers via son propre CDN, ce qui evite au
 * passage de faire transiter chaque photo par l'application.
 * <p>
 * La configuration passe par {@code CLOUDINARY_URL}, de la forme
 * {@code cloudinary://cle:secret@nom-du-compte}. Ce format porte les trois
 * informations d'authentification : c'est un secret, au meme titre qu'un
 * mot de passe.
 */
@Component
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "cloudinary")
@Slf4j
public class CloudinaryImageStorage implements ImageStorage {

    /** Dossier de destination dans la bibliotheque Cloudinary. */
    private static final String FOLDER = "rentcar/cars";

    private static final String CONFIGURATION_MANQUANTE =
            "Stockage Cloudinary actif mais CLOUDINARY_URL est vide. "
                    + "Format attendu : cloudinary://cle:secret@nom-du-compte";

    /** {@code null} lorsque la configuration est absente : les televersements echouent alors. */
    private final Cloudinary cloudinary;

    /**
     * Signale une configuration incomplete sans empecher le demarrage.
     * <p>
     * Faire echouer le contexte serait disproportionne : l'application
     * entiere — connexion, catalogue, reservations — tomberait parce qu'une
     * seule fonctionnalite est mal configuree. Le probleme reste visible,
     * puisqu'il est journalise en ERROR au demarrage et que tout
     * televersement echoue ensuite avec le meme message.
     */
    @Autowired
    public CloudinaryImageStorage(@Value("${app.storage.cloudinary.url:}") String cloudinaryUrl) {
        if (StringUtils.hasText(cloudinaryUrl)) {
            this.cloudinary = new Cloudinary(cloudinaryUrl);
        } else {
            this.cloudinary = null;
            log.error(CONFIGURATION_MANQUANTE);
        }
    }

    /** Variante permettant aux tests de fournir un client simule. */
    CloudinaryImageStorage(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @Override
    public String store(MultipartFile file, String filename) {
        if (cloudinary == null) {
            throw new ImageStorageException(CONFIGURATION_MANQUANTE);
        }

        try {
            // Le nom est transmis sans extension : Cloudinary la deduit du
            // contenu et l'ajoute a l'URL renvoyee.
            String publicId = stripExtension(filename);

            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", FOLDER,
                            "public_id", publicId,
                            "resource_type", "image",
                            "overwrite", false));

            Object secureUrl = result.get("secure_url");
            if (secureUrl == null) {
                throw new ImageStorageException(
                        "Cloudinary n'a pas renvoye d'URL pour " + filename);
            }

            log.info("Image televersee sur Cloudinary : {}", secureUrl);
            return secureUrl.toString();

        } catch (IOException e) {
            throw new ImageStorageException("Televersement Cloudinary impossible : " + filename, e);
        }
    }

    private static String stripExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(0, lastDot) : filename;
    }
}
