package com.rentcar.rent_car.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Origines autorisees pour la poignee de main SockJS.
     * <p>
     * Le controle d'origine du WebSocket est independant de la configuration
     * CORS HTTP : une origine figee ici bloquerait le chat en production meme
     * si les appels REST passent. On reutilise volontairement la meme propriete
     * {@code app.cors.allowed-origins}, pour n'avoir qu'une variable a definir.
     * <p>
     * La valeur d'initialisation garde la classe utilisable hors contexte Spring.
     */
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins = "http://localhost:5173,http://localhost:3000";

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Destination pour les messages du serveur vers le client
        config.enableSimpleBroker("/topic", "/queue");

        // Préfixe pour les messages du client vers le serveur
        config.setApplicationDestinationPrefixes("/app");

        // Destination personnalisée par utilisateur
        config.setUserDestinationPrefix("/user");
    }

    /** Decoupe la liste et retire les barres obliques finales. */
    private String[] resolveAllowedOrigins() {
        return Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .map(origin -> origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin)
                .toArray(String[]::new);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Point de connexion WebSocket
        registry.addEndpoint("/ws")
                .setAllowedOrigins(resolveAllowedOrigins())
                .withSockJS(); // Fallback si WebSocket non supporté
    }
}
