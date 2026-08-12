package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.ContractResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.security.UserDetailsImpl;
import com.rentcar.rent_car.service.ContractService;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContractControllerTest {

    @Mock
    private ContractService contractService;

    @InjectMocks
    private ContractController contractController;

    private UserDetailsImpl userDetails;

    @BeforeEach
    void setUp() {
        userDetails = new UserDetailsImpl(1L, "client@test.com", "pass", null, true);
    }

    @Test
    void shouldSignContract_whenSuccess() {
        when(contractService.signContract(50L, "client@test.com"))
                .thenReturn(MessageResponse.success("Signé"));

        ResponseEntity<MessageResponse> response = contractController.signContract(50L, userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().isSuccess()).isTrue();
    }

    @Test
    void shouldSignContract_whenError() {
        when(contractService.signContract(50L, "client@test.com"))
                .thenReturn(MessageResponse.error("Déjà signé"));

        ResponseEntity<MessageResponse> response = contractController.signContract(50L, userDetails);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().isSuccess()).isFalse();
    }

    @Test
    void shouldGetContractByReservation() {
        when(contractService.getContractByReservation(100L)).thenReturn(new ContractResponse());

        ResponseEntity<ContractResponse> response = contractController.getContractByReservation(100L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldGetContractById() {
        when(contractService.getContractById(50L)).thenReturn(new ContractResponse());

        ResponseEntity<ContractResponse> response = contractController.getContractById(50L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldGetAllContracts() {
        when(contractService.getAllContracts()).thenReturn(List.of(new ContractResponse()));

        ResponseEntity<List<ContractResponse>> response = contractController.getAllContracts();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldCancelContract_whenSuccess() {
        when(contractService.cancelContract(50L)).thenReturn(MessageResponse.success("Annulé"));

        ResponseEntity<MessageResponse> response = contractController.cancelContract(50L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldCancelContract_whenError() {
        when(contractService.cancelContract(50L)).thenReturn(MessageResponse.error("Erreur"));

        ResponseEntity<MessageResponse> response = contractController.cancelContract(50L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
