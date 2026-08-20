package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.response.PublicStatsResponse;
import com.rentcar.rent_car.service.PublicStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicStatsController {

    private final PublicStatsService publicStatsService;

    /**
     * Chiffres affichés aux visiteurs, connectés ou non.
     * <p>
     * Accessible sans authentification : l'accueil et la page de connexion
     * s'affichent avant tout compte.
     */
    @GetMapping("/stats")
    public ResponseEntity<PublicStatsResponse> getPublicStats() {
        return ResponseEntity.ok(publicStatsService.getPublicStats());
    }
}
