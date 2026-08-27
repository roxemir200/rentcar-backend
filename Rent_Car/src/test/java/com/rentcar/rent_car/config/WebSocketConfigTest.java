package com.rentcar.rent_car.config;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class WebSocketConfigTest {

    @Test
    void shouldConfigureMessageBroker() {
        WebSocketConfig config = new WebSocketConfig();
        MessageBrokerRegistry registry = mock(MessageBrokerRegistry.class);

        config.configureMessageBroker(registry);

        verify(registry).enableSimpleBroker("/topic", "/queue");
        verify(registry).setApplicationDestinationPrefixes("/app");
        verify(registry).setUserDestinationPrefix("/user");
    }

    @Test
    void shouldRegisterStompEndpoints() {
        WebSocketConfig config = new WebSocketConfig();
        StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
        StompWebSocketEndpointRegistration registration = mock(StompWebSocketEndpointRegistration.class);

        when(registry.addEndpoint("/ws")).thenReturn(registration);
        // setAllowedOrigins est varargs : depuis que les origines sont
        // configurables, plusieurs valeurs peuvent etre passees.
        when(registration.setAllowedOrigins(any(String[].class))).thenReturn(registration);

        config.registerStompEndpoints(registry);

        verify(registry).addEndpoint("/ws");
        verify(registration).withSockJS();
    }

    /**
     * Les origines sont saisies a la main sur l'hebergeur : barre finale et
     * separateurs superflus y sont la regle. Le controle d'origine du
     * WebSocket compare des chaines exactes — « https://rentcar.app/ » ne
     * correspond pas a l'origine « https://rentcar.app » que le navigateur
     * annonce, et le chat cesse de fonctionner alors que le REST passe.
     */
    @Test
    void shouldNormaliseTheConfiguredOrigins() {
        WebSocketConfig config = new WebSocketConfig();
        ReflectionTestUtils.setField(config, "allowedOrigins",
                " https://rentcar.app/ , ,http://localhost:5173 ");

        StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
        StompWebSocketEndpointRegistration registration = mock(StompWebSocketEndpointRegistration.class);
        when(registry.addEndpoint("/ws")).thenReturn(registration);
        when(registration.setAllowedOrigins(any(String[].class))).thenReturn(registration);

        config.registerStompEndpoints(registry);

        ArgumentCaptor<String[]> origines = ArgumentCaptor.forClass(String[].class);
        verify(registration).setAllowedOrigins(origines.capture());
        assertThat(origines.getValue())
                .containsExactly("https://rentcar.app", "http://localhost:5173");
    }
}
