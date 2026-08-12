package com.rentcar.rent_car.security;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private UserDetailsServiceImpl userDetailsService;

    @InjectMocks
    private JwtAuthFilter jwtAuthFilter;

    @Test
    void shouldSkipFilterForLoginAndRegisterEndpoints() throws Exception {
        MockHttpServletRequest requestLogin = new MockHttpServletRequest();
        requestLogin.setServletPath("/api/auth/login");
        MockHttpServletResponse responseLogin = new MockHttpServletResponse();
        FilterChain chainLogin = mock(FilterChain.class);

        jwtAuthFilter.doFilter(requestLogin, responseLogin, chainLogin);
        verify(chainLogin).doFilter(any(), any());

        MockHttpServletRequest requestRegister = new MockHttpServletRequest();
        requestRegister.setServletPath("/api/auth/register");
        MockHttpServletResponse responseRegister = new MockHttpServletResponse();
        FilterChain chainRegister = mock(FilterChain.class);

        jwtAuthFilter.doFilter(requestRegister, responseRegister, chainRegister);
        verify(chainRegister).doFilter(any(), any());
    }

    @Test
    void shouldSetAuthenticationWhenHeaderTokenIsValid() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServletPath("/api/cars");
        request.addHeader("Authorization", "Bearer valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        when(jwtUtils.validateToken("valid-token")).thenReturn(true);
        when(jwtUtils.getEmailFromToken("valid-token")).thenReturn("client@test.com");
        when(userDetailsService.loadUserByUsername("client@test.com"))
                .thenReturn(new UserDetailsImpl(1L, "client@test.com", "pwd", "CLIENT", true));

        jwtAuthFilter.doFilter(request, response, chain);

        verify(chain).doFilter(any(), any());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void shouldSetAuthenticationWhenQueryTokenIsValid() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServletPath("/api/notifications/stream");
        request.setParameter("token", "query-valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        when(jwtUtils.validateToken("query-valid-token")).thenReturn(true);
        when(jwtUtils.getEmailFromToken("query-valid-token")).thenReturn("client@test.com");
        when(userDetailsService.loadUserByUsername("client@test.com"))
                .thenReturn(new UserDetailsImpl(1L, "client@test.com", "pwd", "CLIENT", true));

        jwtAuthFilter.doFilter(request, response, chain);

        verify(chain).doFilter(any(), any());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void shouldNotSetAuthenticationWhenTokenIsInvalidOrMissing() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServletPath("/api/cars");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        SecurityContextHolder.clearContext();
        jwtAuthFilter.doFilter(request, response, chain);

        verify(chain).doFilter(any(), any());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void shouldNotFilterAsyncOrErrorDispatches() {
        MockHttpServletRequest requestAsync = new MockHttpServletRequest();
        requestAsync.setDispatcherType(DispatcherType.ASYNC);

        boolean shouldNotFilterAsync = jwtAuthFilter.shouldNotFilter(requestAsync);
        assertThat(shouldNotFilterAsync).isTrue();

        assertThat(jwtAuthFilter.shouldNotFilterAsyncDispatch()).isFalse();
        assertThat(jwtAuthFilter.shouldNotFilterErrorDispatch()).isFalse();
    }
}
