package com.rentcar.rent_car.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Une mesure d'experience percue, relevee dans le navigateur du visiteur.
 * <p>
 * Ces valeurs ne peuvent venir de nulle part ailleurs : un frontend est un
 * ensemble de fichiers statiques servis par un CDN, sans processus a
 * interroger. Seul le navigateur sait combien de temps la page a mis a
 * s'afficher chez l'utilisateur.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebVitalRequest {

    /** Nom de la mesure : LCP, INP ou CLS. Toute autre valeur est rejetee. */
    @NotBlank
    private String name;

    /** Valeur brute. Millisecondes pour LCP et INP, sans unite pour CLS. */
    @NotNull
    private Double value;

    /**
     * Verdict calcule par la bibliotheque web-vitals :
     * good, needs-improvement ou poor.
     */
    @NotBlank
    private String rating;

    /**
     * Chemin de la page. Il sera ramene a un MOTIF de route avant tout
     * enregistrement : « /reservation/42 » devient « /reservation/:id ».
     * Conserver le chemin brut creerait une serie temporelle par
     * reservation, et saturerait le quota de metriques en quelques jours.
     */
    private String path;
}
