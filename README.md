# NextWorth

A collection of personal finance calculators built with Spring Boot and Thymeleaf. All calculations run client-side in the browser — no data is stored or transmitted.

**Available tools**
- Net Worth Calculator — current net worth, future projection, SIP corpus, surplus tracking
- EMI Calculator
- SIP Calculator
- FD Calculator

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Java | 25 | Only needed for local development without Docker |
| Maven | 3.9+ | Only needed for local development without Docker |
| Docker | 24+ | Required for Docker / Docker Compose deployment |
| Docker Compose | v2 (plugin) | Required for Compose deployment |

Verify your installations:

```bash
java -version
mvn -version
docker --version
docker compose version
```

---

## Running Locally (without Docker)

### 1. Clone the repository

```bash
git clone <repository-url>
cd nextworth
```

### 2. Build the project

```bash
./mvnw clean package -DskipTests
```

On Windows:

```cmd
mvnw.cmd clean package -DskipTests
```

### 3. Run the application

```bash
java -jar target/nextworth-0.0.1-SNAPSHOT.jar
```

Or run directly through Maven:

```bash
./mvnw spring-boot:run
```

### 4. Open in browser

```
http://localhost:8080
```

---

## Running with Docker

### Option A — Docker Compose (recommended)

This is the simplest way to build and run the application.

**Start the application:**

```bash
docker compose up --build
```

The `--build` flag ensures the image is rebuilt from the current source. On subsequent runs where nothing has changed, you can omit it:

```bash
docker compose up
```

**Run in the background (detached mode):**

```bash
docker compose up --build -d
```

**Stop the application:**

```bash
docker compose down
```

**View logs:**

```bash
docker compose logs -f
```

Open in browser: `http://localhost:8080`

---

### Option B — Docker CLI

**Build the image:**

```bash
docker build -t nextworth:latest .
```

**Run the container:**

```bash
docker run -p 8080:8080 nextworth:latest
```

**Run in the background:**

```bash
docker run -d -p 8080:8080 --name nextworth nextworth:latest
```

**Stop and remove the container:**

```bash
docker stop nextworth && docker rm nextworth
```

---

## Configuration

### Changing the port

By default the application runs on port **8080**. To use a different host port, set the `APP_PORT` environment variable before running Compose:

```bash
APP_PORT=9090 docker compose up -d
```

Or create a `.env` file in the project root:

```env
APP_PORT=9090
```

For the Docker CLI, change the `-p` flag:

```bash
docker run -d -p 9090:8080 --name nextworth nextworth:latest
```

### JVM memory tuning

The default JVM heap is `-Xms128m -Xmx256m`, which is sufficient for this application. To override, set `JAVA_OPTS`:

```bash
JAVA_OPTS="-Xms64m -Xmx512m" docker compose up -d
```

Or add it to your `.env` file:

```env
JAVA_OPTS=-Xms64m -Xmx512m
```

### Spring profiles

Use `SPRING_PROFILES_ACTIVE` to activate a specific Spring profile:

```bash
SPRING_PROFILES_ACTIVE=production docker compose up -d
```

---

## Project Structure

```
nextworth/
├── Dockerfile                      # Multi-stage Docker build
├── docker-compose.yml              # Compose deployment config
├── .dockerignore                   # Files excluded from Docker build context
├── pom.xml                         # Maven build config (Spring Boot 4.0.5, Java 25)
├── mvnw / mvnw.cmd                 # Maven wrapper scripts
└── src/
    └── main/
        ├── java/in/nextworth/
        │   ├── NextworthApplication.java       # Spring Boot entry point
        │   └── controller/
        │       ├── HomeController.java         # Routes: /
        │       └── NetWorthController.java     # Routes: /net-worth-calculator
        └── resources/
            ├── application.properties
            ├── static/
            │   ├── css/
            │   │   ├── style.css               # Global styles and theme variables
            │   │   └── net-worth.css           # Net Worth calculator styles
            │   └── js/
            │       ├── theme.js                # Dark/light mode toggle
            │       └── net-worth.js            # Net Worth calculator logic
            └── templates/
                ├── index.html                  # Home page
                ├── net-worth.html              # Net Worth calculator page
                └── fragments/
                    ├── head.html               # Shared <head> fragment
                    ├── header.html             # Site header and navigation
                    └── footer.html             # Site footer and theme toggle
```

---

## How the Docker Build Works

The Dockerfile uses a **multi-stage build** to keep the final image small:

1. **Builder stage** (`eclipse-temurin:25-jdk`) — runs Maven to compile the source and produce the fat JAR. Dependencies are downloaded in a separate layer so they are cached on subsequent builds when only source files change.

2. **Runtime stage** (`eclipse-temurin:25-jre`) — copies only the compiled JAR from the builder stage. The JDK (compiler, tools) is not included in the final image. The application runs as a non-root user (`appuser`) for security.

Typical image sizes:
- Builder stage (intermediate): ~600 MB
- Final image: ~250 MB

---

## Health Check

The Compose configuration includes a health check that polls `http://localhost:8080/` every 30 seconds. You can inspect the health status with:

```bash
docker inspect --format='{{.State.Health.Status}}' nextworth
```

Or via Compose:

```bash
docker compose ps
```

---

## Troubleshooting

**Port already in use**

```
Error: bind: address already in use
```

Another process is using port 8080. Either stop that process or change the port using `APP_PORT` as described above.

**Build fails: cannot find Java 25**

The build runs inside Docker and pulls the `eclipse-temurin:25-jdk` image automatically — no local Java installation is needed for Docker builds. If the image pull fails, check your internet connection or Docker Hub access.

**Out of memory during build**

Maven can be memory-intensive. If the build fails with an OOM error, increase Docker's memory limit in Docker Desktop under Settings → Resources → Memory.

**`./mvnw` permission denied (local development)**

```bash
chmod +x mvnw
```
