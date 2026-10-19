package com.airadar.api;

import com.airadar.config.RadarProperties;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LocalTokenFilterTest {

    private RadarProperties properties;
    private LocalTokenFilter filter;

    @BeforeEach
    void setUp() {
        properties = new RadarProperties();
        properties.setLocalToken("secret");
        filter = new LocalTokenFilter(properties);
    }

    @Test
    void healthGetBypassesToken() throws Exception {
        MockHttpServletResponse res = run("GET", "/api/health", null);
        assertEquals(200, res.getStatus());
    }

    @Test
    void healthLlmGetBypassesToken() throws Exception {
        MockHttpServletResponse res = run("GET", "/api/health/llm", null);
        assertEquals(200, res.getStatus());
    }

    @Test
    void mutatingWithoutTokenIsUnauthorized() throws Exception {
        MockHttpServletResponse res = run("POST", "/api/jobs/fetch", null);
        assertEquals(401, res.getStatus());
        assertTrue(res.getContentAsString().contains("unauthorized"));
    }

    @Test
    void mutatingWithTokenPasses() throws Exception {
        MockHttpServletResponse res = run("POST", "/api/jobs/fetch", "secret");
        assertEquals(200, res.getStatus());
    }

    @Test
    void mutatingWithPaddedTokenPasses() throws Exception {
        properties.setLocalToken("  secret  ");
        MockHttpServletResponse res = run("POST", "/api/jobs/fetch", "  secret  ");
        assertEquals(200, res.getStatus());
    }

    @Test
    void mutatingWithWrongTokenIsUnauthorized() throws Exception {
        MockHttpServletResponse res = run("POST", "/api/jobs/fetch", "nope");
        assertEquals(401, res.getStatus());
        assertTrue(res.getContentAsString().contains("unauthorized"));
    }

    @Test
    void blankConfiguredTokenDisablesGuard() throws Exception {
        properties.setLocalToken("  ");
        MockHttpServletResponse res = run("POST", "/api/jobs/fetch", null);
        assertEquals(200, res.getStatus());
    }

    @Test
    void settingsGetRequiresToken() throws Exception {
        MockHttpServletResponse denied = run("GET", "/api/settings", null);
        assertEquals(401, denied.getStatus());
        MockHttpServletResponse ok = run("GET", "/api/settings", "secret");
        assertEquals(200, ok.getStatus());
    }

    @Test
    void nonApiPathsBypass() throws Exception {
        MockHttpServletResponse res = run("GET", "/swagger-ui.html", null);
        assertEquals(200, res.getStatus());
    }

    @Test
    void readOnlyApiGetBypassesWithoutToken() throws Exception {
        // Only mutating methods + /api/settings require the token when configured.
        MockHttpServletResponse res = run("GET", "/api/connectors", null);
        assertEquals(200, res.getStatus());
    }

    @Test
    void settingsPutRequiresToken() throws Exception {
        MockHttpServletResponse denied = run("PUT", "/api/settings", null);
        assertEquals(401, denied.getStatus());
        MockHttpServletResponse ok = run("PUT", "/api/settings", "secret");
        assertEquals(200, ok.getStatus());
    }

    private MockHttpServletResponse run(String method, String path, String token)
            throws ServletException, IOException {
        MockHttpServletRequest req = new MockHttpServletRequest(method, path);
        req.setRequestURI(path);
        if (token != null) {
            req.addHeader("X-Local-Token", token);
        }
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(req, res, chain);
        return res;
    }
}
