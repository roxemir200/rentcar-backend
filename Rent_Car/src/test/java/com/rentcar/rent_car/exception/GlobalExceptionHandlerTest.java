package com.rentcar.rent_car.exception;

import com.rentcar.rent_car.dto.response.MessageResponse;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

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
}
