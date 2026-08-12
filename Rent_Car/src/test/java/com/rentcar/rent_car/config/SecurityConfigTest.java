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

        assertThat(result).isEqualTo(manager);
    }

    @Test
    void shouldTestInternalDispatchMatcher() {
        RequestMatcher matcher = (RequestMatcher) ReflectionTestUtils.getField(SecurityConfig.class, "INTERNAL_DISPATCH_MATCHER");

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
        AuthenticationEntryPoint entryPoint = (AuthenticationEntryPoint) ReflectionTestUtils.getField(securityConfig, "restAuthenticationEntryPoint");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/protected");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AuthenticationException exception = new BadCredentialsException("Bad creds");

        entryPoint.commence(request, response, exception);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
        assertThat(response.getContentAsString()).contains("Authentification requise");
    }

    @Test
    void shouldHandleRestAuthenticationEntryPoint_whenResponseIsCommitted() throws Exception {
        AuthenticationEntryPoint entryPoint = (AuthenticationEntryPoint) ReflectionTestUtils.getField(securityConfig, "restAuthenticationEntryPoint");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/sse/stream");
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.isCommitted()).thenReturn(true);

        entryPoint.commence(request, response, new BadCredentialsException("Bad creds"));

        verify(response, never()).setStatus(anyInt());
    }

    @Test
    void shouldHandleRestAccessDeniedHandler_whenResponseIsUncommitted() throws Exception {
        AccessDeniedHandler accessDeniedHandler = (AccessDeniedHandler) ReflectionTestUtils.getField(securityConfig, "restAccessDeniedHandler");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/admin/forbidden");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AccessDeniedException exception = new AccessDeniedException("Access denied");

        accessDeniedHandler.handle(request, response, exception);

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_FORBIDDEN);
        assertThat(response.getContentAsString()).contains("Accès refusé");
    }

    @Test
    void shouldHandleRestAccessDeniedHandler_whenResponseIsCommitted() throws Exception {
        AccessDeniedHandler accessDeniedHandler = (AccessDeniedHandler) ReflectionTestUtils.getField(securityConfig, "restAccessDeniedHandler");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/sse/stream");
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.isCommitted()).thenReturn(true);

        accessDeniedHandler.handle(request, response, new AccessDeniedException("Access denied"));

        verify(response, never()).setStatus(anyInt());
    }

    @Test
    void shouldTestEscapeJsonMethod() throws Exception {
        java.lang.reflect.Method escapeMethod = SecurityConfig.class.getDeclaredMethod("escapeJson", String.class);
        escapeMethod.setAccessible(true);

        assertThat(escapeMethod.invoke(null, (Object) null)).isEqualTo("null");
        assertThat(escapeMethod.invoke(null, "hello \"world\"\n\r\t\\ \u0001")).isEqualTo("\"hello \\\"world\\\"\\n\\r\\t\\\\ \\u0001\"");
    }
}
