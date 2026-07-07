package com.rentcar.rent_car.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MessageResponse {

    private boolean success;
    private String message;
    private Object data;
    private LocalDateTime timestamp;

    // Méthode statique pour créer une réponse de succès rapidement
    public static MessageResponse success(String message) {
        return MessageResponse.builder()
                .success(true)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    // Méthode statique pour créer une réponse de succès avec données
    public static MessageResponse success(String message, Object data) {
        return MessageResponse.builder()
                .success(true)
                .message(message)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    // Méthode statique pour créer une réponse d'erreur
    public static MessageResponse error(String message) {
        return MessageResponse.builder()
                .success(false)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }
}