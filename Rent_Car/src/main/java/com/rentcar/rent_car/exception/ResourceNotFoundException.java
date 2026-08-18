package com.rentcar.rent_car.exception;

/**
 * Ressource demandee inexistante.
 * <p>
 * Distincte d'une {@code RuntimeException} generique, qui se traduit en 500 :
 * une ressource absente est une reponse legitime, pas une panne du serveur.
 * Le client peut s'y adapter — un paiement pas encore cree pour une
 * reservation est un etat normal du parcours, pas une erreur.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
