package com.airadar.persistence;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Converter(autoApply = true)
public class InstantStringConverter implements AttributeConverter<Instant, String> {

    private static final DateTimeFormatter SQLITE_DATETIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public String convertToDatabaseColumn(Instant attribute) {
        return attribute == null ? null : attribute.toString();
    }

    @Override
    public Instant convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        String value = dbData.trim();
        try {
            return Instant.parse(value);
        } catch (Exception ignored) {
            // Flyway / SQLite datetime('now') → "yyyy-MM-dd HH:mm:ss"
        }
        try {
            return LocalDateTime.parse(value, SQLITE_DATETIME).toInstant(ZoneOffset.UTC);
        } catch (Exception ignored) {
            // fall through
        }
        if (value.length() >= 19) {
            try {
                return LocalDateTime.parse(value.substring(0, 19), SQLITE_DATETIME).toInstant(ZoneOffset.UTC);
            } catch (Exception ignored) {
                // fall through
            }
        }
        throw new IllegalArgumentException("Cannot parse instant: " + dbData);
    }
}
