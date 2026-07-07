package com.rentcar.rent_car.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getServletPath();
        if (path.startsWith("/api/auth/")) {
            filterChain.doFilter(request, response);
            return; // Ne pas appliquer le filtre JWT
        }

        // 1. Extraire le token du header Authorization
        String token = extractTokenFromRequest(request);

        // 2. Si token existe et est valide
        if (token != null && jwtUtils.validateToken(token)) {

            // 3. Extraire l'email du token
            String email = jwtUtils.getEmailFromToken(token);

            // 4. Charger l'utilisateur depuis la base de données
            UserDetailsImpl userDetails = (UserDetailsImpl) userDetailsService.loadUserByUsername(email);

            // 5. Créer l'objet d'authentification
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );

            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            // 6. Mettre l'utilisateur dans le contexte de sécurité
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        // 7. Continuer la chaîne de filtres
        filterChain.doFilter(request, response);
    }

    // Extraire le token du header "Authorization: Bearer xxx"
    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // Enlever "Bearer " (7 caractères)
        }

        return null;
    }
}