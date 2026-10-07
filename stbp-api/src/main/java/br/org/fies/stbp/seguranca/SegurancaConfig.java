package br.org.fies.stbp.seguranca;

import java.nio.charset.StandardCharsets;
import java.time.Clock;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(SegurancaProperties.class)
class SegurancaConfig {

    @Bean
    SecurityFilterChain filtros(HttpSecurity http, ConversorTokenUsuario conversor) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/instituicoes/*/logo", "/api/unidades/*/imagem").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                        .requestMatchers("/api/auth/eu", "/api/auth/senha").authenticated()
                        .requestMatchers("/error").permitAll()
                        .anyRequest().hasAuthority(ConversorTokenUsuario.SENHA_EM_DIA))
                .oauth2ResourceServer(o -> o
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(conversor))
                        .accessDeniedHandler(acessoNegado()))
                .build();
    }

    /** Diferencia "troca de senha pendente" do acesso negado comum, para o frontend redirecionar à tela certa. */
    private AccessDeniedHandler acessoNegado() {
        return (request, response, e) -> {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            boolean senhaPendente = auth != null && auth.getPrincipal() instanceof UsuarioAutenticado u
                    && u.trocarSenha();
            response.setStatus(403);
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write(senhaPendente
                    ? "{\"status\":403,\"title\":\"Forbidden\",\"codigo\":\"TROCA_DE_SENHA_OBRIGATORIA\","
                            + "\"detail\":\"Troque sua senha antes de continuar\"}"
                    : "{\"status\":403,\"title\":\"Forbidden\",\"detail\":\"Acesso negado\"}");
        };
    }

    /** SUPERADMIN > ADMIN > TECNICO > LEITOR: cada perfil herda as permissões dos anteriores. */
    @Bean
    static RoleHierarchy hierarquiaPerfis() {
        return RoleHierarchyImpl.fromHierarchy("""
                ROLE_SUPERADMIN > ROLE_ADMIN
                ROLE_ADMIN > ROLE_TECNICO
                ROLE_TECNICO > ROLE_LEITOR
                """);
    }

    /** BCrypt aceita os hashes "$2y$" gerados pelo Laravel: as senhas migradas continuam válidas. */
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    JwtEncoder jwtEncoder(SegurancaProperties propriedades) {
        return NimbusJwtEncoder.withSecretKey(chave(propriedades)).build();
    }

    @Bean
    JwtDecoder jwtDecoder(SegurancaProperties propriedades) {
        return NimbusJwtDecoder.withSecretKey(chave(propriedades)).macAlgorithm(MacAlgorithm.HS256).build();
    }

    @Bean
    Clock relogio() {
        return Clock.systemUTC();
    }

    private static SecretKey chave(SegurancaProperties propriedades) {
        return new SecretKeySpec(propriedades.jwtSegredo().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }
}
