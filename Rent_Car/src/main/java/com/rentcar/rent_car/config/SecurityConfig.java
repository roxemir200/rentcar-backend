package com.rentcar.rent_car.config;

import com.rentcar.rent_car.security.JwtAuthFilter;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.RequestMatcher;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    /**
     * RequestMatcher qui ne matche QUE les dispatch types INTERNES à Tomcat/Spring :
     * ASYNC (SseEmitter finalisation, ...), ERROR, FORWARD.
     * <p>
     * Ces dispatchs sont INTERNES : l'authentification / autorisation a déjà été
     * validée sur la requête REQUEST initiale. Les revalider produit systématiquement
     * AuthorizationDeniedException sur les flux SSE déconnectés, couplé à
     * "response is already committed".
     */
    private static final RequestMatcher INTERNAL_DISPATCH_MATCHER =
            request -> {
                DispatcherType dt = request.getDispatcherType();
                return dt == DispatcherType.ASYNC
                        || dt == DispatcherType.ERROR
                        || dt == DispatcherType.FORWARD;
            };

    /**
     * Point d'entrée d'authentification personnalisé.
     * - Si la réponse est déjà COMMITTÉE (flux SSE en cours) : on log en DEBUG
     *   (pas ERROR) et on ne touche PAS à la réponse pour éviter
     *   "Unable to handle ... response is already committed".
     * - Sinon : réponse JSON REST cohérente 401.
     */
    private final AuthenticationEntryPoint restAuthenticationEntryPoint = (request, response, authException) -> {
        if (response.isCommitted()) {
            log.debug("Authentication failed but response already committed (SSE stream likely). Silently ignoring. URI={}",
                    request.getRequestURI());
            return;
        }
        writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                "Authentification requise. Veuillez vous connecter.");
    };

    /**
     * Handler d'accès refusé personnalisé (même logique que entryPoint).
     * - Réponse COMMITTÉE (ex: SSE async dispatch) : DEBUG silencieux
     * - Sinon : JSON REST cohérent 403.
     */
    private final AccessDeniedHandler restAccessDeniedHandler = (request, response, accessDeniedException) -> {
        if (response.isCommitted()) {
            log.debug("Access denied but response already committed (SSE async dispatch likely). Silently ignoring. URI={}",
                    request.getRequestURI());
            return;
        }
        writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                "Accès refusé. Vous n'avez pas les autorisations nécessaires.");
    };

    private static void writeJsonError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        String json = "{\"success\":false,\"message\":" + escapeJson(message) + "}";
        response.getWriter().write(json);
        response.getWriter().flush();
    }

    private static String escapeJson(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder(s.length() + 8);
        sb.append('"');
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> sb.append(c < 0x20 ? String.format("\\u%04x", (int) c) : c);
            }
        }
        sb.append('"');
        return sb.toString();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(request -> {
                    var config = new org.springframework.web.cors.CorsConfiguration();
                    config.setAllowedOrigins(Arrays.asList("http://localhost:5173"));
                    config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                    config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));
                    config.setExposedHeaders(Arrays.asList("Authorization"));
                    config.setAllowCredentials(true);
                    config.setMaxAge(3600L);
                    return config;
                }))
                .csrf(csrf -> csrf.disable())

                .authorizeHttpRequests(auth -> auth
                        // ⭐ 1ère règle : autoriser IMMÉDIATEMENT tous les dispatches INTERNES
                        // ASYNC/ERROR/FORWARD. Empêche AuthorizationDeniedException sur SSE.
                        .requestMatchers(INTERNAL_DISPATCH_MATCHER).permitAll()

                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // ========== ROUTES PUBLIQUES ==========
                        .requestMatchers("/api/auth/register").permitAll()
                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/forgot-password").permitAll()
                        .requestMatchers("/api/auth/verify-token").permitAll()
                        .requestMatchers("/api/auth/reset-password").permitAll()
                        .requestMatchers("/api/auth/verify-email").permitAll()
                        .requestMatchers("/api/auth/resend-verification").permitAll()
                        .requestMatchers("/api/auth/check-email").permitAll()
                        .requestMatchers("/api/auth/check-phone").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/cars/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                        .requestMatchers("/api/webhooks/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/car/**").permitAll()
                        .requestMatchers("/swagger-ui/**").permitAll()
                        .requestMatchers("/swagger-ui.html").permitAll()
                        .requestMatchers("/api-docs/**").permitAll()
                        .requestMatchers("/v3/api-docs/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/sockjs/**").permitAll()

                        .requestMatchers(HttpMethod.PUT, "/api/auth/profile").permitAll()

                        // ========== ROUTES ADMIN ==========
                        .requestMatchers(HttpMethod.POST, "/api/admin/upload-image").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/dashboard/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/users/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/calendar/**").hasRole("ADMIN")

                        // ========== ROUTES CLIENT ==========
                        .requestMatchers(HttpMethod.POST, "/api/reservations").hasRole("CLIENT")
                        .requestMatchers(HttpMethod.GET, "/api/reservations/my-reservations").hasRole("CLIENT")
                        .requestMatchers(HttpMethod.POST, "/api/reviews").hasRole("CLIENT")
                        .requestMatchers(HttpMethod.GET, "/api/reviews/my-reviews").hasRole("CLIENT")
                        .requestMatchers(HttpMethod.PUT, "/api/contracts/*/sign").hasRole("CLIENT")
                        .requestMatchers(HttpMethod.POST, "/api/payments/create-intent").hasRole("CLIENT")
                        .requestMatchers(HttpMethod.GET, "/api/payments/my-payments").hasRole("CLIENT")
                        .requestMatchers("/api/chat/**").authenticated()

                        // ========== ROUTES AUTHENTIFIÉES (Client ou Admin) ==========
                        .requestMatchers(HttpMethod.GET, "/api/contracts/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/reservations/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/reservations/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/payments/reservation/**").authenticated()
                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/auth/change-password").authenticated()

                        // ========== TOUT LE RESTE ==========
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(restAuthenticationEntryPoint)
                        .accessDeniedHandler(restAccessDeniedHandler)
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
}
