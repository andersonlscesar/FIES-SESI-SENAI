package br.org.fies.stbp;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

import br.org.fies.stbp.usuario.Perfil;
import br.org.fies.stbp.usuario.StatusUsuario;
import br.org.fies.stbp.usuario.Usuario;
import br.org.fies.stbp.usuario.UsuarioRepository;

/** Base dos testes de integração: API completa sobre um Postgres real (Testcontainers) com as migrações Flyway. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
public abstract class TesteIntegracao {

    protected static final String SENHA = "senha-de-teste";

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected UsuarioRepository usuarios;

    @Autowired
    protected PasswordEncoder encoder;

    @Autowired
    protected JdbcTemplate jdbc;

    /** Instituições: 1 = SESI, 2 = SENAI. */
    protected static final long SESI = 1, SENAI = 2;
    /** Unidades: SEDE e CETAF-AJU nas duas instituições; CEFEM só SESI; CETAF-EST só SENAI. */
    protected static final long SEDE = 1, CETAF_AJU = 2, CEFEM = 3, CETAF_EST = 4;

    @BeforeEach
    void limparBanco() {
        jdbc.execute("TRUNCATE saida_material_item, saida_material, item, transferencia, usuario, unidade_instituicao, unidade, instituicao "
                + "RESTART IDENTITY CASCADE");
        jdbc.execute("INSERT INTO instituicao (id, nome) VALUES (1, 'SESI'), (2, 'SENAI')");
        jdbc.execute("INSERT INTO unidade (id, nome) VALUES (1, 'SEDE'), (2, 'CETAF-AJU'), (3, 'CEFEM'), (4, 'CETAF-EST')");
        jdbc.execute("INSERT INTO unidade_instituicao (unidade_id, instituicao_id) "
                + "VALUES (1, 1), (1, 2), (2, 1), (2, 2), (3, 1), (4, 2)");
        jdbc.execute("SELECT setval(pg_get_serial_sequence('instituicao', 'id'), 2), "
                + "setval(pg_get_serial_sequence('unidade', 'id'), 4)");
    }

    /** Cria um usuário ativo, com senha {@link #SENHA} e sem troca de senha pendente. */
    protected Usuario criarUsuario(String login, Perfil perfil) {
        var usuario = new Usuario("Usuário " + login, login, login + "@fies.org.br", null, perfil);
        usuario.definirSenha(encoder.encode(SENHA));
        return usuarios.save(usuario);
    }

    protected Usuario criarUsuario(String login, Perfil perfil, StatusUsuario status) {
        var usuario = criarUsuario(login, perfil);
        usuario.alterarStatus(status);
        return usuarios.save(usuario);
    }

    protected String login(String identificador, String senha) throws Exception {
        String corpo = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("usuario", identificador, "senha", senha)))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(corpo, "$.token");
    }

    protected String tokenDe(Usuario usuario) throws Exception {
        return "Bearer " + login(usuario.getLogin(), SENHA);
    }

    /** Monta um objeto JSON simples a partir de pares chave/valor (valores string). */
    protected static String json(String... chavesEValores) {
        var sb = new StringBuilder("{");
        for (int i = 0; i < chavesEValores.length; i += 2) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append('"').append(chavesEValores[i]).append("\":\"")
                    .append(chavesEValores[i + 1].replace("\"", "\\\"")).append('"');
        }
        return sb.append('}').toString();
    }
}
