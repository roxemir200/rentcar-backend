package com.rentcar.rent_car.config;

import com.rentcar.rent_car.security.JwtAuthFilter;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.DefaultSecurityFilterChain;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Mock
    private JwtAuthFilter jwtAuthFilter;

    @Mock
    private AuthenticationConfiguration authConfig;

    private SecurityConfig securityConfig;

    @BeforeEach
    void setUp() {
        securityConfig = new SecurityConfig(jwtAuthFilter);
    }

    @Test
    void shouldCreatePasswordEncoderBean() {
        PasswordEncoder encoder = securityConfig.passwordEncoder();
        assertThat(encoder).isNotNull();
        assertThat(encoder.encode("password")).isNotBlank();
    }

    @Test
    void shouldCreateAuthenticationManagerBean() throws Exception {
        AuthenticationManager manager = mock(AuthenticationManager.class);
        when(authConfig.getAuthenticationManager()).thenReturn(manager);

        AuthenticationManager result = securityConfig.authenticationManager(authConfig);

        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(manager);
        verify(authConfig).getAuthenticationManager();
    }

   @Test
void shouldThrowWhenAuthenticationManagerIsNull() throws Exception {
    when(authConfig.getAuthenticationManager()).thenReturn(null);

    // ✅ Correction: S'attendre à IllegalStateException
    assertThatThrownBy(() -> securityConfig.authenticationManager(authConfig))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("AuthenticationManager non disponible");
}

@Test
void shouldHandleAuthenticationManagerException() throws Exception {
    // ✅ Simuler une autre exception (comme une IOException)
    when(authConfig.getAuthenticationManager())
            .thenThrow(new RuntimeException("Configuration error"));

    // ✅ Correction: S'attendre à RuntimeException
    assertThatThrownBy(() -> securityConfig.authenticationManager(authConfig))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Erreur de configuration de l'authentification");
}

    @Test
    void shouldTestInternalDispatchMatcher() {
        RequestMatcher matcher = (RequestMatcher) ReflectionTestUtils.getField(
                SecurityConfig.class, "INTERNAL_DISPATCH_MATCHER");

        MockHttpServletRequest requestAsync = new MockHttpServletRequest();
        requestAsync.setDispatcherType(DispatcherType.ASYNC);
        assertThat(matcher.matches(requestAsync)).isTrue();

        MockHttpServletRequest requestError = new MockHttpServletRequest();
        requestError.setDispatcherType(DispatcherType.ERROR);
        assertThat(matcher.matches(requestError)).isTrue();

        MockHttpServletRequest requestForward = new MockHttpServletRequest();
        requestForward.setDispatcherType(DispatcherType.FORWARD);
        assertThat(matcher.matches(requestForward)).isTrue();

        MockHttpServletRequest requestNormal = new MockHttpServletRequest();
        requestNormal.setDispatcherType(DispatcherType.REQUEST);
        assertThat(matcher.matches(requestNormal)).isFalse();
    }

    @Test
    void shouldHandleRestAuthenticationEntryPoint_whenResponseIsUncommitted() throws Exception {
        AuthenticationEntryPoint entryPoint = (AuthenticationEntryPoint) ReflectionTestUtils.getField(
                securityConfig, "restAuthenticationEntryPoint");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/protected");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AuthenticationException exception = new BadCredentialsException("Bad creds");

        entryPoint.commence(request, response, exception);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
        assertThat(response.getContentAsString()).contains("Authentification requise");
        assertThat(response.getContentAsString()).contains("\"success\":false");
    }

    @Test
    void shouldHandleRestAuthenticationEntryPoint_whenResponseIsCommitted() throws Exception {
        AuthenticationEntryPoint entryPoint = (AuthenticationEntryPoint) ReflectionTestUtils.getField(
                securityConfig, "restAuthenticationEntryPoint");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/sse/stream");
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.isCommitted()).thenReturn(true);

        entryPoint.commence(request, response, new BadCredentialsException("Bad creds"));

        verify(response, never()).setStatus(anyInt());
        verify(response, never()).getWriter();
    }

    @Test
    void shouldHandleRestAccessDeniedHandler_whenResponseIsUncommitted() throws Exception {
        AccessDeniedHandler accessDeniedHandler = (AccessDeniedHandler) ReflectionTestUtils.getField(
                securityConfig, "restAccessDeniedHandler");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/admin/forbidden");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AccessDeniedException exception = new AccessDeniedException("Access denied");

        accessDeniedHandler.handle(request, response, exception);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_FORBIDDEN);
        assertThat(response.getContentAsString()).contains("Accès refusé");
        assertThat(response.getContentAsString()).contains("\"success\":false");
    }

    @Test
    void shouldHandleRestAccessDeniedHandler_whenResponseIsCommitted() throws Exception {
        AccessDeniedHandler accessDeniedHandler = (AccessDeniedHandler) ReflectionTestUtils.getField(
                securityConfig, "restAccessDeniedHandler");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/sse/stream");
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.isCommitted()).thenReturn(true);

        accessDeniedHandler.handle(request, response, new AccessDeniedException("Access denied"));

        verify(response, never()).setStatus(anyInt());
        verify(response, never()).getWriter();
    }

    @Test
    void shouldTestEscapeJsonMethod() throws Exception {
        java.lang.reflect.Method escapeMethod = SecurityConfig.class.getDeclaredMethod("escapeJson", String.class);
        escapeMethod.setAccessible(true);

        assertThat(escapeMethod.invoke(null, (Object) null)).isEqualTo("null");
        assertThat(escapeMethod.invoke(null, "hello \"world\"\n\r\t\\ \u0001"))
                .isEqualTo("\"hello \\\"world\\\"\\n\\r\\t\\\\ \\u0001\"");
        assertThat(escapeMethod.invoke(null, "simple text"))
                .isEqualTo("\"simple text\"");
    }

    // ✅ TEST CORRIGÉ: Configuration CORS
    @Test
    void shouldCreateCorsConfigurationSource() {
        var corsSource = securityConfig.corsConfigurationSource();
        assertThat(corsSource).isNotNull();
        assertThat(corsSource).isInstanceOf(UrlBasedCorsConfigurationSource.class);

        UrlBasedCorsConfigurationSource source = (UrlBasedCorsConfigurationSource) corsSource;

        // ✅ Correction: Utiliser getCorsConfigurations() qui retourne un Map
        var corsConfigs = source.getCorsConfigurations();
        assertThat(corsConfigs).isNotEmpty();

        // Récupérer la configuration pour le pattern "/**"
        CorsConfiguration corsConfig = corsConfigs.get("/**");
        assertThat(corsConfig).isNotNull();
        assertThat(corsConfig.getAllowedOrigins()).contains("http://localhost:5173");
        assertThat(corsConfig.getAllowedMethods()).contains("GET", "POST", "PUT", "DELETE", "OPTIONS");
        assertThat(corsConfig.getAllowedHeaders()).contains("Authorization", "Content-Type");
        assertThat(corsConfig.getAllowCredentials()).isTrue();
    }

    @Test
    void shouldEncodePasswordCorrectly() {
        PasswordEncoder encoder = securityConfig.passwordEncoder();
        String rawPassword = "test123";
        String encodedPassword = encoder.encode(rawPassword);

        assertThat(encodedPassword).isNotBlank();
        assertThat(encodedPassword).isNotEqualTo(rawPassword);
        assertThat(encoder.matches(rawPassword, encodedPassword)).isTrue();
    }

    // ✅ TEST CORRIGÉ: SecurityFilterChain
    @Test
    void shouldNotThrowWhenBuildingSecurityFilterChain() throws Exception {
        // ✅ Correction: Utiliser HttpSecurity mocké avec le bon type de retour
        HttpSecurity http = mock(HttpSecurity.class);

        // ✅ Mock des méthodes avec le bon chaînage
        when(http.cors(any())).thenReturn(http);
        when(http.csrf(any())).thenReturn(http);
        when(http.authorizeHttpRequests(any())).thenReturn(http);
        when(http.exceptionHandling(any())).thenReturn(http);
        when(http.sessionManagement(any())).thenReturn(http);
        when(http.addFilterBefore(any(), any())).thenReturn(http);

        // ✅ CORRECTION: http.build() retourne DefaultSecurityFilterChain
        DefaultSecurityFilterChain mockFilterChain = mock(DefaultSecurityFilterChain.class);
        when(http.build()).thenReturn(mockFilterChain);

        // Appel de la méthode
        SecurityFilterChain filterChain = securityConfig.filterChain(http);

        // Vérification
        assertThat(filterChain).isNotNull();
        assertThat(filterChain).isEqualTo(mockFilterChain);
        verify(http).build();
    }
}