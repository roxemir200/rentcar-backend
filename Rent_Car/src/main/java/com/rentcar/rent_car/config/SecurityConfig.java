package com.rentcar.rent_car.config;

import com.rentcar.rent_car.security.JwtAuthFilter;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    /**
     * Origines autorisees, injectees depuis {@code app.cors.allowed-origins}.
     * <p>
     * En developpement, la valeur par defaut couvre Vite et CRA ; en production,
     * elle vient de la variable d'environnement CORS_ALLOWED_ORIGINS.
     * <p>
     * Attention : une origine ne comporte ni chemin ni barre oblique finale.
     * {@code https://app.vercel.app/} ne correspondra a aucune requete.
     * <p>
     * La valeur d'initialisation sert de filet quand la classe est instanciee
     * hors contexte Spring (tests unitaires) : Spring la remplace a l'injection.
     */
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins = "http://localhost:5173,http://localhost:3000";

    private static final List<String> ALLOWED_METHODS = Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"
    );

    private static final List<String> ALLOWED_HEADERS = Arrays.asList(
            "Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"
    );

    private static final List<String> EXPOSED_HEADERS = Arrays.asList(
            "Authorization", "Content-Disposition"
    );

    private static final RequestMatcher INTERNAL_DISPATCH_MATCHER =
            request -> {
                DispatcherType dt = request.getDispatcherType();
                return dt == DispatcherType.ASYNC
                        || dt == DispatcherType.ERROR
                        || dt == DispatcherType.FORWARD;
            };

    private final AuthenticationEntryPoint restAuthenticationEntryPoint = (request, response, authException) -> {
        if (response.isCommitted()) {
            log.debug("Authentication failed but response already committed. URI={}", request.getRequestURI());
            return;
        }
        writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                "Authentification requise. Veuillez vous connecter.");
    };

    private final AccessDeniedHandler restAccessDeniedHandler = (request, response, accessDeniedException) -> {
        if (response.isCommitted()) {
            log.debug("Access denied but response already committed. URI={}", request.getRequestURI());
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

    /**
     * Decoupe la liste d'origines et retire les barres obliques finales,
     * cause d'echec CORS la plus frequente en production.
     */
    private List<String> resolveAllowedOrigins() {
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .map(origin -> origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin)
                .toList();

        log.info("🌐 Origines CORS autorisees : {}", origins);
        return origins;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(resolveAllowedOrigins());
        config.setAllowedMethods(ALLOWED_METHODS);
        config.setAllowedHeaders(ALLOWED_HEADERS);
        config.setExposedHeaders(EXPOSED_HEADERS);
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // ✅ Ajout de @SuppressWarnings pour ignorer le warning SonarQube
    // La désactivation CSRF est sécurisée car l'API utilise JWT stateless
    // Pas de cookies de session → pas de risque CSRF
    @Bean
    @SuppressWarnings({"java:S4502", "unused"})
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // CSRF désactivé car JWT stateless (pas de cookies de session)
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(INTERNAL_DISPATCH_MATCHER).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Sonde de vivacite interrogee par l'hebergeur.
                        // Volontairement limitee a /actuator/health : ouvrir
                        // /actuator/** exposerait la configuration complete
                        // et les variables d'environnement.
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()

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
                        .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
                        // Seule route publique EN ECRITURE de l'application.
                        // Elle recoit les mesures d'experience percue relevees
                        // dans le navigateur ; les visiteurs mesures ne sont
                        // pas authentifies, il ne peut donc pas en aller
                        // autrement. La regle est nominative, et non un
                        // POST /api/public/** ouvert : elle n'autorise que
                        // cette route-la. La protection reelle est en aval,
                        // dans WebVitalsServiceImpl, qui n'enregistre que ce
                        // qui figure dans une liste fermee.
                        .requestMatchers(HttpMethod.POST, "/api/public/web-vitals").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/car/**").permitAll()
                        .requestMatchers("/swagger-ui/**").permitAll()
                        .requestMatchers("/swagger-ui.html").permitAll()
                        .requestMatchers("/api-docs/**").permitAll()
                        .requestMatchers("/v3/api-docs/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/sockjs/**").permitAll()

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

                        // ========== ROUTES AUTHENTIFIÉES ==========
                        .requestMatchers(HttpMethod.GET, "/api/contracts/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/reservations/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/reservations/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/payments/reservation/**").authenticated()
                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/auth/change-password").authenticated()
                        // Etait en permitAll() : n'importe qui pouvait modifier un profil
                        // sans jeton. Le controleur doit en outre verifier que
                        // l'utilisateur modifie bien le sien.
                        .requestMatchers(HttpMethod.PUT, "/api/auth/profile").authenticated()

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
        log.info("🔐 Initialisation de AuthenticationManager");
        
        try {
            AuthenticationManager authManager = authConfig.getAuthenticationManager();
            
            if (authManager == null) {
                log.error("❌ AuthenticationManager non initialisé");
                throw new IllegalStateException("AuthenticationManager non disponible");
            }
            
            log.info("✅ AuthenticationManager initialisé avec succès");
            return authManager;
            
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'initialisation de AuthenticationManager: {}", e.getMessage());
            throw new RuntimeException("Erreur de configuration de l'authentification", e);
        }
    }
}