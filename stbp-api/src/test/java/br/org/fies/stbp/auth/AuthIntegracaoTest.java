package br.org.fies.stbp.auth;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import br.org.fies.stbp.TesteIntegracao;
import br.org.fies.stbp.usuario.Perfil;
import br.org.fies.stbp.usuario.StatusUsuario;
import br.org.fies.stbp.usuario.Usuario;

class AuthIntegracaoTest extends TesteIntegracao {

    /** Gerado pelo PHP com password_hash("senha-do-laravel", PASSWORD_BCRYPT), como o Laravel faz. */
    private static final String HASH_LARAVEL = "$2y$10$2YjyITKbnHE83AwtSha.Qul0jAtlauVv1qc2oAYMQFosNw.UVrvyW";

    @Test
    void aceitaSenhaMigradaDoLaravelPorLoginOuEmail() throws Exception {
        var usuario = new Usuario("Migrado", "migrado", "migrado@fies.org.br", null, Perfil.TECNICO);
        usuario.definirSenha(HASH_LARAVEL);
        usuarios.save(usuario);

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("usuario", "MIGRADO", "senha", "senha-do-laravel")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.usuario.perfil").value("TECNICO"));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("usuario", "migrado@fies.org.br", "senha", "senha-do-laravel")))
                .andExpect(status().isOk());
    }

    @Test
    void senhaErradaEUsuarioInexistenteTemAMesmaResposta() throws Exception {
        criarUsuario("tecnico", Perfil.TECNICO);

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("usuario", "tecnico", "senha", "errada")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Usuário ou senha inválidos"));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("usuario", "ninguem", "senha", "errada")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Usuário ou senha inválidos"));
    }

    @Test
    void usuarioBloqueadoOuExcluidoNaoEntra() throws Exception {
        criarUsuario("bloqueado", Perfil.TECNICO, StatusUsuario.BLOQUEADO);
        criarUsuario("excluido", Perfil.TECNICO, StatusUsuario.EXCLUIDO);

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("usuario", "bloqueado", "senha", SENHA)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("A conta está bloqueada"));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("usuario", "excluido", "senha", SENHA)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Usuário ou senha inválidos"));
    }

    @Test
    void bloqueioDerrubaTokenJaEmitido() throws Exception {
        var usuario = criarUsuario("tecnico", Perfil.TECNICO);
        String token = tokenDe(usuario);
        mvc.perform(get("/api/auth/eu").header("Authorization", token)).andExpect(status().isOk());

        usuario.alterarStatus(StatusUsuario.BLOQUEADO);
        usuarios.save(usuario);

        mvc.perform(get("/api/auth/eu").header("Authorization", token)).andExpect(status().isUnauthorized());
    }

    @Test
    void semTokenOuTokenInvalidoRecebe401() throws Exception {
        mvc.perform(get("/api/auth/eu")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/eu").header("Authorization", "Bearer abc.def.ghi"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void trocaDeSenhaPendenteLiberaSomenteOPerfilEATroca() throws Exception {
        var admin = criarUsuario("admin", Perfil.ADMIN);
        admin.redefinirSenha(encoder.encode(SENHA));
        usuarios.save(admin);
        String token = tokenDe(admin);

        mvc.perform(get("/api/auth/eu").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trocarSenha").value(true));
        mvc.perform(get("/api/usuarios").header("Authorization", token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("TROCA_DE_SENHA_OBRIGATORIA"));

        mvc.perform(put("/api/auth/senha").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content(json("senhaAtual", SENHA, "novaSenha", "nova-senha-123")))
                .andExpect(status().isNoContent());

        // O mesmo token passa a valer para o resto da API
        mvc.perform(get("/api/usuarios").header("Authorization", token)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("usuario", "admin", "senha", "nova-senha-123")))
                .andExpect(status().isOk());
    }

    @Test
    void trocaDeSenhaExigeSenhaAtualCorretaENovaSenhaValida() throws Exception {
        String token = tokenDe(criarUsuario("tecnico", Perfil.TECNICO));

        mvc.perform(put("/api/auth/senha").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content(json("senhaAtual", "errada", "novaSenha", "nova-senha-123")))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("A senha atual não confere"));

        mvc.perform(put("/api/auth/senha").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content(json("senhaAtual", SENHA, "novaSenha", "curta")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.novaSenha").value("A nova senha deve ter entre 8 e 72 caracteres"));
    }

    @Test
    void limitaTentativasDeLoginPorMinuto() throws Exception {
        criarUsuario("alvo", Perfil.TECNICO);
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .content(json("usuario", "alvo", "senha", "errada")))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json("usuario", "alvo", "senha", SENHA)))
                .andExpect(status().isTooManyRequests());
    }
}
