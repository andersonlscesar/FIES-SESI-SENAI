# Etapa 1: compila e empacota (os testes rodam no CI/localmente, pois exigem Docker)
FROM eclipse-temurin:21-jdk AS build
WORKDIR /build
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -q dependency:go-offline
COPY src/ src/
RUN ./mvnw -q package -DskipTests && cp target/stbp-api-*.jar app.jar

# Etapa 2: imagem final só com o JRE
FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 stbp
WORKDIR /app
COPY --from=build /build/app.jar app.jar
USER stbp
ENV TZ=America/Sao_Paulo \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -fs http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
