package com.rentcar.rent_car.security;

import jakarta.servlet.DispatcherType;
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
import java.util.EnumSet;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final EnumSet<DispatcherType> INTERNAL_DISPATCHES =
            EnumSet.of(DispatcherType.ASYNC, DispatcherType.ERROR, DispatcherType.FORWARD);

    private final JwtUtils jwtUtils;
    private final UserDetailsServiceImpl userDetailsService;

    /**
     * ⭐ Bonne pratique SSE / async :
     * Pour les dispatches INTERNES (ASYNC/ERROR/FORWARD), on SAUTE complètement
     * la validation JWT + la mise à jour du SecurityContext.
     * <p>
     * Pourquoi : ces dispatches sont déclenchés par Tomcat/Spring MVC pour :
     * - terminer une requête Async SSE (déconnexion client, timeout, erreur d'écriture)
     * - gérer une page d'erreur
     * - faire un forward/include
     * L'authentification a déjà été validée sur le DispatchType.REQUEST initial.
     * Revalider/refournir un Authentication ici vide (car le token n'est plus présent
     * dans le dispatch interne) ferait perdre le contexte et produirait des
     * AuthorizationDeniedException sur les SSE.
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return INTERNAL_DISPATCHES.contains(request.getDispatcherType());
    }

    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        // On veut que shouldNotFilter() (ci-dessus) soit bien évalué même sur un dispatch ASYNC.
        return false;
    }

    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getServletPath();

        // Ignorer SEULEMENT login et register (pas besoin de token)
        if (path.equals("/api/auth/login") || path.equals("/api/auth/register")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Pour toutes les autres routes (y compris /api/auth/profile et /api/auth/me)
        String token = extractTokenFromRequest(request);

        if (token != null && jwtUtils.validateToken(token)) {
            String email = jwtUtils.getEmailFromToken(token);
            UserDetailsImpl userDetails = (UserDetailsImpl) userDetailsService.loadUserByUsername(email);

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    // Extraire le token du header "Authorization: Bearer xxx" ou du paramètre query "token"
    private String extractTokenFromRequest(HttpServletRequest request) {
        // Essayer d'abord le header Authorization
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // Enlever "Bearer " (7 caractères)
        }

        // Si pas dans le header, essayer le paramètre query "token" (pour SSE)
        String queryToken = request.getParameter("token");
        if (StringUtils.hasText(queryToken)) {
            return queryToken;
        }

        return null;
    }
}
