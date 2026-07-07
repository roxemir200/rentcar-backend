package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.ContractResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.security.UserDetailsImpl;
import com.rentcar.rent_car.service.ContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService contractService;

    // ========== ROUTES CLIENT ==========

    /**
     * Signer un contrat
     * Le client clique sur "Je signe" → le contrat devient SIGNED
     */
    @PutMapping("/contracts/{id}/sign")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<MessageResponse> signContract(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        MessageResponse response = contractService.signContract(id, userDetails.getEmail());

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }

    // ========== ROUTES AUTHENTIFIÉES ==========

    /**
     * Voir le contrat d'une réservation
     */
    @GetMapping("/contracts/reservation/{reservationId}")
    public ResponseEntity<ContractResponse> getContractByReservation(
            @PathVariable Long reservationId) {
        return ResponseEntity.ok(contractService.getContractByReservation(reservationId));
    }

    /**
     * Voir un contrat par son ID
     */
    @GetMapping("/contracts/{id}")
    public ResponseEntity<ContractResponse> getContractById(@PathVariable Long id) {
        return ResponseEntity.ok(contractService.getContractById(id));
    }

    // ========== ROUTES ADMIN ==========



    /**
     * Voir tous les contrats
     */
    @GetMapping("/admin/contracts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ContractResponse>> getAllContracts() {
        return ResponseEntity.ok(contractService.getAllContracts());
    }
    @PutMapping("/admin/contracts/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> cancelContract(@PathVariable Long id) {
        MessageResponse response = contractService.cancelContract(id);

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }
}