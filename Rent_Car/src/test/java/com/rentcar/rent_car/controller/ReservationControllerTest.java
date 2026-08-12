package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.CompleteReservationRequest;
import com.rentcar.rent_car.dto.request.ReservationRequest;
import com.rentcar.rent_car.dto.request.StartReservationRequest;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.ReservationResponse;
import com.rentcar.rent_car.security.UserDetailsImpl;
import com.rentcar.rent_car.service.ReservationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationControllerTest {

    @Mock
    private ReservationService reservationService;

    @InjectMocks
    private ReservationController reservationController;

    private UserDetailsImpl userDetails;

    @BeforeEach
    void setUp() {
        userDetails = new UserDetailsImpl(1L, "client@test.com", "pass", null, true);
    }

    @Test
    void shouldCreateReservation_whenSuccess() {
        when(reservationService.createReservation(any(ReservationRequest.class), eq("client@test.com")))
                .thenReturn(MessageResponse.success("Réservation créée"));

        ResponseEntity<MessageResponse> response = reservationController.createReservation(
                new ReservationRequest(), userDetails
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().isSuccess()).isTrue();
    }

    @Test
    void shouldCreateReservation_whenError() {
        when(reservationService.createReservation(any(ReservationRequest.class), eq("client@test.com")))
                .thenReturn(MessageResponse.error("Voiture non disponible"));

        ResponseEntity<MessageResponse> response = reservationController.createReservation(
                new ReservationRequest(), userDetails
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().isSuccess()).isFalse();
    }

    @Test
    void shouldGetMyReservations() {
        when(reservationService.getMyReservations("client@test.com"))
                .thenReturn(List.of(new ReservationResponse()));

        ResponseEntity<List<ReservationResponse>> response = reservationController.getMyReservations(userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldGetReservationById() {
        when(reservationService.getReservationById(100L)).thenReturn(new ReservationResponse());

        ResponseEntity<ReservationResponse> response = reservationController.getReservationById(100L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldCancelReservation_whenSuccess() {
        when(reservationService.cancelReservation(100L, "client@test.com"))
                .thenReturn(MessageResponse.success("Annulée"));

        ResponseEntity<MessageResponse> response = reservationController.cancelReservation(100L, userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldCancelReservation_whenError() {
        when(reservationService.cancelReservation(100L, "client@test.com"))
                .thenReturn(MessageResponse.error("Non autorisé"));

        ResponseEntity<MessageResponse> response = reservationController.cancelReservation(100L, userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldGetAllReservations() {
        when(reservationService.getAllReservations()).thenReturn(List.of(new ReservationResponse()));

        ResponseEntity<List<ReservationResponse>> response = reservationController.getAllReservations();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldConfirmReservation() {
        when(reservationService.confirmReservation(100L)).thenReturn(MessageResponse.success("Confirmée"));

        ResponseEntity<MessageResponse> response = reservationController.confirmReservation(100L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldStartReservation() {
        when(reservationService.startReservation(eq(100L), any(StartReservationRequest.class)))
                .thenReturn(MessageResponse.success("Démarrée"));

        ResponseEntity<MessageResponse> response = reservationController.startReservation(
                100L, new StartReservationRequest()
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldCompleteReservation() {
        when(reservationService.completeReservation(eq(100L), any(CompleteReservationRequest.class)))
                .thenReturn(MessageResponse.success("Terminée"));

        ResponseEntity<MessageResponse> response = reservationController.completeReservation(
                100L, new CompleteReservationRequest()
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
