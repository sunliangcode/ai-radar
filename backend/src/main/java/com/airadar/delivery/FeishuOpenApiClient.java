package com.airadar.delivery;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Thin Feishu OpenAPI client (token + IM message). Base URL is injectable for tests.
 */
@Component
public class FeishuOpenApiClient {

    private static final Logger log = LoggerFactory.getLogger(FeishuOpenApiClient.class);

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;
    private final String baseUrl;

    public FeishuOpenApiClient(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            @Value("${radar.delivery.feishu-api-base:https://open.feishu.cn}") String baseUrl
    ) {
        this.restClientBuilder = restClientBuilder;
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    public String tenantAccessToken(String appId, String appSecret) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("app_id", appId);
        body.put("app_secret", appSecret);
        try {
            String raw = restClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/open-apis/auth/v3/tenant_access_token/internal")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(objectMapper.writeValueAsString(body))
                    .retrieve()
                    .body(String.class);
            JsonNode node = objectMapper.readTree(raw == null ? "{}" : raw);
            int code = node.path("code").asInt(-1);
            if (code != 0) {
                throw new IllegalStateException("feishu token code=" + code + " msg=" + node.path("msg").asText());
            }
            String token = node.path("tenant_access_token").asText(null);
            if (token == null || token.isBlank()) {
                throw new IllegalStateException("feishu token missing in response");
            }
            return token;
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("feishu token failed: " + e.getMessage(), e);
        }
    }

    public void sendInteractive(String tenantToken, String openId, Map<String, Object> card) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("receive_id", openId);
        body.put("msg_type", "interactive");
        body.put("content", writeJson(card));
        try {
            String raw = restClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/open-apis/im/v1/messages?receive_id_type=open_id")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + tenantToken)
                    .body(objectMapper.writeValueAsString(body))
                    .retrieve()
                    .body(String.class);
            JsonNode node = objectMapper.readTree(raw == null ? "{}" : raw);
            int code = node.path("code").asInt(-1);
            if (code != 0) {
                throw new IllegalStateException("feishu im code=" + code + " msg=" + node.path("msg").asText());
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("feishu im send failed: " + e.getMessage(), e);
        }
    }

    public void sendText(String tenantToken, String openId, String text) {
        Map<String, Object> content = new LinkedHashMap<>();
        content.put("text", text);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("receive_id", openId);
        body.put("msg_type", "text");
        body.put("content", writeJson(content));
        try {
            String raw = restClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/open-apis/im/v1/messages?receive_id_type=open_id")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + tenantToken)
                    .body(objectMapper.writeValueAsString(body))
                    .retrieve()
                    .body(String.class);
            JsonNode node = objectMapper.readTree(raw == null ? "{}" : raw);
            int code = node.path("code").asInt(-1);
            if (code != 0) {
                log.warn("feishu welcome dm failed code={} msg={}", code, node.path("msg").asText());
            }
        } catch (Exception e) {
            log.warn("feishu welcome dm failed: {}", e.getMessage());
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
