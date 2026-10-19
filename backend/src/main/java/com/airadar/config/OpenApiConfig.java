package com.airadar.config;

import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI aiRadarOpenApi(RadarProperties properties) {
        String apiVersion = properties.getApi().getVersion();
        return new OpenAPI()
                .info(new Info()
                        .title("AI Radar API")
                        .version(apiVersion)
                        .description(
                                "Personal AI intelligence pipeline (fetch → score → events → impact → delivery). "
                                        + "Swagger tags: **Health**, **Connectors**, **Delivery**. "
                                        + "SPI catalogs: GET /api/connectors (sorted case-insensitive; id==typeCode; "
                                        + SpiCatalogBlurbs.CONNECTOR_EXPECT
                                        + ") · "
                                        + "GET /api/delivery/channels (sorted case-insensitive; id==channel(); "
                                        + SpiCatalogBlurbs.DELIVERY_EXPECT
                                        + "). "
                                        + "Live LLM probe: GET /api/health/llm (modelPresent/hint; CLI health-llm / MCP probe_llm). "
                                        + "Ops: ./bin/ai-radar · docs/api.md · docs/extensibility.md."
                        )
                        .contact(new Contact()
                                .name("AI Radar")
                                .url("https://github.com/sunliangcode/ai-radar"))
                        .license(new License()
                                .name("MIT")
                                .url("https://opensource.org/licenses/MIT")))
                .externalDocs(new ExternalDocumentation()
                        .description("HTTP API overview")
                        .url("https://github.com/sunliangcode/ai-radar/blob/main/docs/api.md"))
                .servers(List.of(
                        new Server()
                                .url("http://127.0.0.1:8080")
                                .description("Local default (AI_RADAR_BASE_URL)")));
    }
}
