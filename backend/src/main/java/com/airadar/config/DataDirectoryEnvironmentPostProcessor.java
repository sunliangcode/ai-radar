package com.airadar.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

/**
 * Runs after config is loaded and before the DataSource / Flyway beans start.
 * SQLite JDBC will not create missing parent directories for the DB file.
 */
public class DataDirectoryEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String jdbcUrl = environment.getProperty(
                "spring.datasource.url",
                "jdbc:sqlite:file:./data/radar.db?journal_mode=WAL&busy_timeout=30000");
        String briefsDir = environment.getProperty("radar.briefs-dir", "./data/briefs");
        DataDirectoryBootstrap.ensureDirectories(jdbcUrl, briefsDir);
    }

    @Override
    public int getOrder() {
        // After application.yml / env are applied so custom paths are respected.
        return Ordered.LOWEST_PRECEDENCE;
    }
}
