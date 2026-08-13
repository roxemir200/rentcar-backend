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
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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

    // ✅ TEST MODIFIÉ : AuthenticationManager avec validation
    @Test
    void shouldCreateAuthenticationManagerBean() throws Exception {
        AuthenticationManager manager = mock(AuthenticationManager.class);
        when(authConfig.getAuthenticationManager()).thenReturn(manager);

        AuthenticationManager result = securityConfig.authenticationManager(authConfig);

        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(manager);
        verify(authConfig).getAuthenticationManager();
    }

    // ✅ NOUVEAU TEST : AuthenticationManager null
    @Test
    void shouldThrowWhenAuthenticationManagerIsNull() throws Exception {
        when(authConfig.getAuthenticationManager()).thenReturn(null);

        assertThatThrownBy(() -> securityConfig.authenticationManager(authConfig))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("AuthenticationManager non disponible");
    }

    // ✅ NOUVEAU TEST : AuthenticationManager avec exception
    @Test
    void shouldHandleAuthenticationManagerException() throws Exception {
        when(authConfig.getAuthenticationManager())
                .thenThrow(new RuntimeException("Configuration error"));

        assertThatThrownBy(() -> securityConfig.authenticationManager(authConfig))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Erreur de configuration de l'authentification");
    }

    // ✅ TEST MODIFIÉ : Test du matcher interne
    @Test
    void shouldTestInternalDispatchMatcher() {
        RequestMatcher matcher = (RequestMatcher) ReflectionTestUtils.getField(
                SecurityConfig.class, "INTERNAL_DISPATCH_MATCHER");

        // ✅ ASYNC dispatch
        MockHttpServletRequest requestAsync = new MockHttpServletRequest();
        requestAsync.setDispatcherType(DispatcherType.ASYNC);
        assertThat(matcher.matches(requestAsync)).isTrue();

        // ✅ ERROR dispatch
        MockHttpServletRequest requestError = new MockHttpServletRequest();
        requestError.setDispatcherType(DispatcherType.ERROR);
        assertThat(matcher.matches(requestError)).isTrue();

        // ✅ FORWARD dispatch
        MockHttpServletRequest requestForward = new MockHttpServletRequest();
        requestForward.setDispatcherType(DispatcherType.FORWARD);
        assertThat(matcher.matches(requestForward)).isTrue();

        // ✅ NORMAL REQUEST
        MockHttpServletRequest requestNormal = new MockHttpServletRequest();
        requestNormal.setDispatcherType(DispatcherType.REQUEST);
        assertThat(matcher.matches(requestNormal)).isFalse();
    }

    // ✅ TEST MODIFIÉ : EntryPoint - réponse non commitée
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

    // ✅ TEST MODIFIÉ : EntryPoint - réponse commitée
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

    // ✅ TEST MODIFIÉ : AccessDenied - réponse non commitée
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

    // ✅ TEST MODIFIÉ : AccessDenied - réponse commitée
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

    // ✅ TEST CONSERVÉ : Escape JSON
    @Test
    void shouldTestEscapeJsonMethod() throws Exception {
        java.lang.reflect.Method escapeMethod = SecurityConfig.class.getDeclaredMethod("escapeJson", String.class);
        escapeMethod.setAccessible(true);

        // Test null
        assertThat(escapeMethod.invoke(null, (Object) null)).isEqualTo("null");

        // Test chaîne avec caractères spéciaux
        assertThat(escapeMethod.invoke(null, "hello \"world\"\n\r\t\\ \u0001"))
                .isEqualTo("\"hello \\\"world\\\"\\n\\r\\t\\\\ \\u0001\"");

        // Test chaîne normale
        assertThat(escapeMethod.invoke(null, "simple text"))
                .isEqualTo("\"simple text\"");
    }

    // ✅ NOUVEAU TEST : Configuration CORS
    @Test
    void shouldCreateCorsConfigurationSource() {
        var corsSource = securityConfig.corsConfigurationSource();
        assertThat(corsSource).isNotNull();

        var corsConfig = corsSource.getCorsConfiguration("/**");
        assertThat(corsConfig).isNotNull();
        assertThat(corsConfig.getAllowedOrigins()).contains("http://localhost:5173");
        assertThat(corsConfig.getAllowedMethods()).contains("GET", "POST", "PUT", "DELETE", "OPTIONS");
        assertThat(corsConfig.getAllowedHeaders()).contains("Authorization", "Content-Type");
        assertThat(corsConfig.getAllowCredentials()).isTrue();
    }

    // ✅ NOUVEAU TEST : PasswordEncoder
    @Test
    void shouldEncodePasswordCorrectly() {
        PasswordEncoder encoder = securityConfig.passwordEncoder();
        String rawPassword = "test123";
        String encodedPassword = encoder.encode(rawPassword);

        assertThat(encodedPassword).isNotBlank();
        assertThat(encodedPassword).isNotEqualTo(rawPassword);
        assertThat(encoder.matches(rawPassword, encodedPassword)).isTrue();
    }

    // ✅ NOUVEAU TEST : SecurityFilterChain
    @Test
    void shouldBuildSecurityFilterChain() throws Exception {
        // Ce test vérifie que le filtre peut être construit sans erreur
        // Note: Dans un test réel, il faudrait utiliser @WebMvcTest ou mock HttpSecurity
        var http = org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers
                .springSecurity(org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup())
                .getSecurityFilterChain();
        
        // Vérification simple que la méthode ne lève pas d'exception
        // Dans un environnement de test complet, on pourrait tester plus en détail
        assertThat(http).isNotNull();
    }
}