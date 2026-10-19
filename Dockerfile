# syntax=docker/dockerfile:1
# Frontend Node major must match root .nvmrc / package engines (>=20.12).

FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
COPY backend/pom.xml .
COPY backend/.mvn .mvn
COPY backend/mvnw .
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline
COPY backend/src ./src
COPY packs /app/packs
COPY --from=frontend /app/frontend/dist/ ./src/main/resources/static/
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
RUN apk add --no-cache wget && mkdir -p /app/data/briefs
# Wildcard survives pom version bumps (SNAPSHOT or release).
COPY --from=backend /app/backend/target/backend-*.jar /app/app.jar
ENV SPRING_DATASOURCE_URL=jdbc:sqlite:file:/app/data/radar.db?journal_mode=WAL&busy_timeout=30000&foreign_keys=on
ENV RADAR_BRIEFS_DIR=/app/data/briefs
EXPOSE 8080
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
