package br.org.fies.stbp.seguranca;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("stbp.seguranca")
public record SegurancaProperties(String jwtSegredo, Duration jwtValidade, int loginTentativasPorMinuto) {

    public SegurancaProperties {
        if (jwtSegredo == null || jwtSegredo.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("""
                    Defina STBP_JWT_SEGREDO com pelo menos 32 caracteres. \
                    Em desenvolvimento, ative o perfil dev: ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev, \
                    ou no VS Code use a configuração "STBP API (dev)" (Executar e Depurar), \
                    ou defina a variável de ambiente SPRING_PROFILES_ACTIVE=dev""");
        }
    }
}
