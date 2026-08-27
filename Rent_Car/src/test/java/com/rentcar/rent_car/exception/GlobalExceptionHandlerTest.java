package com.rentcar.rent_car.exception;

import com.rentcar.rent_car.dto.response.MessageResponse;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.sql.SQLIntegrityConstraintViolationException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    /**
     * Une immatriculation en double est une erreur de l'appelant, corrigeable
     * par lui : elle doit produire un 409, pas un 500.
     */
    @Test
    void shouldReturnConflictOnDuplicateEntry() {
        DataIntegrityViolationException e = new DataIntegrityViolationException(
                "could not execute statement",
                new SQLIntegrityConstraintViolationException(
                        "Duplicate entry 'AB-123-CD' for key 'cars.UKi3ldfyekqw49cw'"));

        ResponseEntity<MessageResponse> response = handler.handleDataIntegrityViolation(e);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("immatriculation");
    }

    /** Le detail SQL ne doit jamais fuiter : il renseigne sur le schema. */
    @Test
    void shouldNotLeakSqlDetailsToTheClient() {
        DataIntegrityViolationException e = new DataIntegrityViolationException(
                "insert into cars (brand,category_id) values (?,?)",
                new SQLIntegrityConstraintViolationException(
                        "Duplicate entry 'AB-123-CD' for key 'cars.UKi3ldfyekqw49cw'"));

        ResponseEntity<MessageResponse> response = handler.handleDataIntegrityViolation(e);

        assertThat(response.getBody().getMessage())
                .doesNotContain("insert into")
                .doesNotContain("UKi3ldfyekqw49cw")
                .doesNotContain("cars.");
    }

    @Test
    void shouldReturnConflictWithGenericMessageForOtherConstraints() {
        DataIntegrityViolationException e = new DataIntegrityViolationException(
                "could not execute statement",
                new SQLIntegrityConstraintViolationException("Column 'brand' cannot be null"));

        ResponseEntity<MessageResponse> response = handler.handleDataIntegrityViolation(e);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().getMessage()).contains("intégrité");
    }

    /**
     * Une ressource absente est un 404, et non un 500 : le frontend peut s'y
     * adapter — proposer de creer le paiement, par exemple — la ou une erreur
     * technique ne lui laisse que le message d'echec.
     */
    @Test
    void shouldReturnNotFoundForAMissingResource() {
        ResponseEntity<MessageResponse> response = handler.handleNotFound(
                new ResourceNotFoundException("Aucun paiement trouvé pour cette réservation"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage())
                .isEqualTo("Aucun paiement trouvé pour cette réservation");
    }

    /**
     * Echec de validation : les champs fautifs sont nommes, ce qui permet au
     * frontend de les signaler precisement plutot que d'afficher un refus
     * global que l'utilisateur ne sait pas corriger.
     */
    @Test
    void shouldListInvalidFields() {
        BindingResult validation = new BeanPropertyBindingResult(new Object(), "demande");
        validation.addError(new FieldError("demande", "email", "doit être une adresse valide"));
        validation.addError(new FieldError("demande", "phoneNumber", "ne doit pas être vide"));

        ResponseEntity<MessageResponse> response = handler.handleValidation(
                new MethodArgumentNotValidException((MethodParameter) null, validation));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getMessage())
                .contains("email : doit être une adresse valide")
                .contains("phoneNumber : ne doit pas être vide");
    }

    /** Sans champ identifie, le client recoit tout de meme un message lisible. */
    @Test
    void shouldFallBackToAGenericMessageWhenNoFieldIsReported() {
        BindingResult validation = new BeanPropertyBindingResult(new Object(), "demande");

        ResponseEntity<MessageResponse> response = handler.handleValidation(
                new MethodArgumentNotValidException((MethodParameter) null, validation));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getMessage()).isEqualTo("Requête invalide.");
    }
}
