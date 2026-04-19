# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM eclipse-temurin:25-jdk AS builder

WORKDIR /app

# Copy Maven wrapper and POM first so dependency layer is cached separately
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source and build
COPY src/ src/
RUN ./mvnw package -DskipTests -B

# ─── Stage 2: Run ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:25-jre

WORKDIR /app

# Non-root user for security
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser
USER appuser

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
