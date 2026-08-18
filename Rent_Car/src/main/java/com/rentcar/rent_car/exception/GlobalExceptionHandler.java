package com.rentcar.rent_car.exception;

import com.rentcar.rent_car.dto.response.MessageResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * Traduit les exceptions techniques en reponses HTTP comprehensibles.
 * <p>
 * Sans ce gestionnaire, toute exception non rattrapee devient un 500 opaque.
 * Le cas concret rencontre : creer une voiture dont l'immatriculation existe
 * deja violait une contrainte d'unicite en base, et le client recevait un
 * 500 « Internal Server Error » — alors qu'il s'agit d'une regle metier que
 * l'utilisateur peut corriger lui-meme.
 * <p>
 * Deux principes appliques ici :
 * <ul>
 *   <li>le code HTTP dit <em>a qui</em> revient la correction — 4xx a
 *       l'appelant, 5xx au serveur ;</li>
 *   <li>le detail technique va dans les journaux, jamais dans la reponse :
 *       un message d'erreur SQL renseigne un attaquant sur le schema.</li>
 * </ul>
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /** Marqueurs presents dans le message des contraintes d'unicite MySQL. */
    private static final String DUPLICATE_MARKER = "Duplicate entry";

    /**
     * Contrainte d'integrite violee : doublon, cle etrangere absente, champ
     * obligatoire vide. C'est un conflit avec l'etat actuel des donnees, donc
     * un 409 — pas une panne du serveur.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<MessageResponse> handleDataIntegrityViolation(DataIntegrityViolationException e) {
        log.warn("Violation de contrainte d'integrite", e);

        String rootMessage = e.getMostSpecificCause().getMessage();
        String message = rootMessage != null && rootMessage.contains(DUPLICATE_MARKER)
                ? "Cette valeur existe déjà. Vérifiez notamment le numéro d'immatriculation, "
                        + "qui doit être unique."
                : "Les données envoyées ne respectent pas une contrainte d'intégrité.";

        return ResponseEntity.status(HttpStatus.CONFLICT).body(MessageResponse.error(message));
    }

    /**
     * Ressource absente : 404, et non 500. Le client peut s'y adapter, par
     * exemple en proposant de creer le paiement plutot qu'en affichant une
     * erreur technique.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<MessageResponse> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(MessageResponse.error(e.getMessage()));
    }

    /**
     * Echec de validation d'un {@code @Valid} : on renvoie les champs fautifs,
     * ce qui permet au frontend de les signaler precisement.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<MessageResponse> handleValidation(MethodArgumentNotValidException e) {
        String details = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + " : " + error.getDefaultMessage())
                .collect(Collectors.joining(" ; "));

        return ResponseEntity.badRequest()
                .body(MessageResponse.error(details.isEmpty() ? "Requête invalide." : details));
    }
}
