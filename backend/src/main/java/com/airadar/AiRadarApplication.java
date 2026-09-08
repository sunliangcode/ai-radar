package com.airadar;

import com.airadar.config.DataDirectoryBootstrap;
import com.airadar.config.RadarProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties(RadarProperties.class)
@EnableScheduling
public class AiRadarApplication {

    public static void main(String[] args) {
        // Must run before Flyway/Hikari: SQLite does not create missing parent dirs.
        DataDirectoryBootstrap.ensureDefaultDirectories();
        SpringApplication.run(AiRadarApplication.class, args);
    }
}
