package com.airadar.api;

import com.airadar.config.RadarProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class LocalTokenFilter extends OncePerRequestFilter {

    private static final Set<String> MUTATING = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final RadarProperties properties;

    public LocalTokenFilter(RadarProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        // Trim so accidental .env / clipboard whitespace does not disable or break the guard.
        String token = properties.getLocalToken();
        if (token != null) {
            token = token.trim();
        }
        if (token == null || token.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }
        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }
        // Liveness + optional LLM probe stay open so compose/UI "Test connection" work without a token.
        if ("GET".equalsIgnoreCase(request.getMethod())
                && (path.equals("/api/health") || path.equals("/api/health/llm"))) {
            filterChain.doFilter(request, response);
            return;
        }
        boolean needsAuth = MUTATING.contains(request.getMethod().toUpperCase())
                || path.startsWith("/api/settings");
        if (!needsAuth) {
            filterChain.doFilter(request, response);
            return;
        }
        String provided = request.getHeader("X-Local-Token");
        if (provided != null) {
            provided = provided.trim();
        }
        if (token.equals(provided)) {
            filterChain.doFilter(request, response);
            return;
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"code\":\"unauthorized\",\"message\":\"invalid or missing X-Local-Token\"}");
    }
}
