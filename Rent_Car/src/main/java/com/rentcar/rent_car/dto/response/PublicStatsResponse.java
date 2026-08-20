package com.rentcar.rent_car.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Chiffres affichés aux visiteurs non connectés (accueil, pages d'authentification).
 * <p>
 * Ils étaient écrits en dur dans le frontend — « 500+ véhicules », « 4.8★ »,
 * « Plus de 10 000 clients satisfaits » — et ne correspondaient à rien.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicStatsResponse {

    /** Nombre de véhicules au catalogue. */
    private long vehicles;

    /** Nombre de comptes clients. */
    private long clients;

    /** Nombre d'avis publiés. */
    private long reviews;

    /** Note moyenne sur 5, arrondie au dixième. {@code null} tant qu'aucun avis n'existe. */
    private Double averageRating;
}
