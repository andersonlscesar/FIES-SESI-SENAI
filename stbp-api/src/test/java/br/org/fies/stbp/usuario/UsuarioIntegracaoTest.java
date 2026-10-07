package br.org.fies.stbp.usuario;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import br.org.fies.stbp.TesteIntegracao;

class UsuarioIntegracaoTest extends TesteIntegracao {

    private static String novoUsuario(String login, String perfil) {
        return json("nome", "Fulano de Tal", "login", login, "email", login + "@fies.org.br",
                "senha", "senha-inicial", "perfil", perfil);
    }

    private static String dadosUsuario(String login, String perfil) {
        return json("nome", "Fulano de Tal", "login", login, "email", login + "@fies.org.br", "perfil", perfil);
    }

    @Test
    void tecnicoELeitorNaoGerenciamUsuarios() throws Exception {
        for (var perfil : new Perfil[] {Perfil.LEITOR, Perfil.TECNICO}) {
            String token = tokenDe(criarUsuario(perfil.name().toLowerCase(), perfil));
            mvc.perform(get("/api/usuarios").header("Authorization", token))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void adminCriaUsuarioQueDeveTrocarASenhaNoPrimeiroAcesso() throws Exception {
        String token = tokenDe(criarUsuario("admin", Perfil.ADMIN));

        mvc.perform(post("/api/usuarios").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content(novoUsuario("Novo.Tecnico", "TECNICO")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.login").value("novo.tecnico"))
                .andExpect(jsonPath("$.status").value("ATIVO"))
                .andExpect(jsonPath("$.trocarSenha").value(true));
    }

    @Test
    void loginEEmailSaoUnicosSemDiferenciarMaiusculas() throws Exception {
        String token = tokenDe(criarUsuario("admin", Perfil.ADMIN));
        criarUsuario("existente", Perfil.TECNICO);

        mvc.perform(post("/api/usuarios").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content(novoUsuario("EXISTENTE", "TECNICO")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Login já está em uso"));
    }

    @Test
    void validaOsCamposObrigatorios() throws Exception {
        String token = tokenDe(criarUsuario("admin", Perfil.ADMIN));

        mvc.perform(post("/api/usuarios").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content(json("nome", "", "login", "com espaço", "email", "invalido", "senha", "123")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nome").value("Informe o nome"))
                .andExpect(jsonPath("$.campos.login").exists())
                .andExpect(jsonPath("$.campos.email").value("E-mail inválido"))
                .andExpect(jsonPath("$.campos.senha").exists())
                .andExpect(jsonPath("$.campos.perfil").value("Informe o perfil"));
    }

    @Test
    void somenteSuperadminCriaOuPromoveSuperadmin() throws Exception {
        String admin = tokenDe(criarUsuario("admin", Perfil.ADMIN));
        String superadmin = tokenDe(criarUsuario("root", Perfil.SUPERADMIN));
        var tecnico = criarUsuario("tecnico", Perfil.TECNICO);

        mvc.perform(post("/api/usuarios").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(novoUsuario("chefe", "SUPERADMIN")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Somente um SUPERADMIN pode atribuir o perfil SUPERADMIN"));

        mvc.perform(put("/api/usuarios/{id}", tecnico.getId()).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(dadosUsuario("tecnico", "SUPERADMIN")))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/usuarios").header("Authorization", superadmin).contentType(MediaType.APPLICATION_JSON)
                        .content(novoUsuario("chefe", "SUPERADMIN")))
                .andExpect(status().isCreated());
    }

    @Test
    void adminNaoAlteraSuperadmin() throws Exception {
        String admin = tokenDe(criarUsuario("admin", Perfil.ADMIN));
        var root = criarUsuario("root", Perfil.SUPERADMIN);

        mvc.perform(put("/api/usuarios/{id}", root.getId()).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(dadosUsuario("root", "SUPERADMIN")))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/usuarios/{id}/bloquear", root.getId()).header("Authorization", admin))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/usuarios/{id}/senha", root.getId()).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(json("novaSenha", "senha-nova-123")))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/usuarios/{id}", root.getId()).header("Authorization", admin))
                .andExpect(status().isForbidden());
    }

    @Test
    void ninguemBloqueiaOuRebaixaASiMesmo() throws Exception {
        var admin = criarUsuario("admin", Perfil.ADMIN);
        String token = tokenDe(admin);

        mvc.perform(post("/api/usuarios/{id}/bloquear", admin.getId()).header("Authorization", token))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(put("/api/usuarios/{id}", admin.getId()).header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(dadosUsuario("admin", "TECNICO")))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("Você não pode alterar o próprio perfil"));
    }

    @Test
    void cicloDeBloqueioExclusaoERestauracao() throws Exception {
        String token = tokenDe(criarUsuario("admin", Perfil.ADMIN));
        var tecnico = criarUsuario("tecnico", Perfil.TECNICO);
        long id = tecnico.getId();

        mvc.perform(post("/api/usuarios/{id}/bloquear", id).header("Authorization", token))
                .andExpect(jsonPath("$.status").value("BLOQUEADO"));
        mvc.perform(post("/api/usuarios/{id}/bloquear", id).header("Authorization", token))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(post("/api/usuarios/{id}/desbloquear", id).header("Authorization", token))
                .andExpect(jsonPath("$.status").value("ATIVO"));

        mvc.perform(delete("/api/usuarios/{id}", id).header("Authorization", token))
                .andExpect(jsonPath("$.status").value("EXCLUIDO"));
        mvc.perform(post("/api/usuarios/{id}/desbloquear", id).header("Authorization", token))
                .andExpect(status().isUnprocessableContent());

        // Excluídos ficam fora da listagem padrão e aparecem com status=EXCLUIDO (lixeira)
        mvc.perform(get("/api/usuarios").header("Authorization", token))
                .andExpect(jsonPath("$.conteudo[*].login", not(hasItem("tecnico"))));
        mvc.perform(get("/api/usuarios").param("status", "EXCLUIDO").header("Authorization", token))
                .andExpect(jsonPath("$.conteudo[*].login", hasItem("tecnico")));

        mvc.perform(post("/api/usuarios/{id}/restaurar", id).header("Authorization", token))
                .andExpect(jsonPath("$.status").value("ATIVO"));
    }

    @Test
    void usuarioComTransferenciasNaoEExcluidoMasPodeSerBloqueado() throws Exception {
        String admin = tokenDe(criarUsuario("admin", Perfil.ADMIN));
        var tecnico = criarUsuario("tecnico", Perfil.TECNICO);
        jdbc.update("INSERT INTO transferencia (data, motivo, instituicao_id, origem_id, destino_id, responsavel_envio, "
                + "responsavel_recebimento, criado_por_id) VALUES (current_date, 'MANUTENCAO', 1, 1, 3, 'A', 'B', ?)",
                tecnico.getId());

        mvc.perform(get("/api/usuarios/{id}", tecnico.getId()).header("Authorization", admin))
                .andExpect(jsonPath("$.emUso").value(true));
        mvc.perform(delete("/api/usuarios/{id}", tecnico.getId()).header("Authorization", admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        "O usuário possui transferências e não pode ser excluído. Bloqueie-o para impedir o acesso"));
        mvc.perform(post("/api/usuarios/{id}/bloquear", tecnico.getId()).header("Authorization", admin))
                .andExpect(jsonPath("$.status").value("BLOQUEADO"));
    }

    @Test
    void senhaRedefinidaPorAdminObrigaATroca() throws Exception {
        String token = tokenDe(criarUsuario("admin", Perfil.ADMIN));
        var tecnico = criarUsuario("tecnico", Perfil.TECNICO);

        mvc.perform(put("/api/usuarios/{id}/senha", tecnico.getId()).header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(json("novaSenha", "temporaria-123")))
                .andExpect(status().isNoContent());

        String tokenTecnico = "Bearer " + login("tecnico", "temporaria-123");
        mvc.perform(get("/api/auth/eu").header("Authorization", tokenTecnico))
                .andExpect(jsonPath("$.trocarSenha").value(true));
    }

    @Test
    void listagemFiltraPorBuscaEPerfil() throws Exception {
        String token = tokenDe(criarUsuario("admin", Perfil.ADMIN));
        criarUsuario("maria.souza", Perfil.TECNICO);
        criarUsuario("joao.lima", Perfil.LEITOR);

        mvc.perform(get("/api/usuarios").param("busca", "SOUZA").header("Authorization", token))
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.conteudo[0].login").value("maria.souza"));
        mvc.perform(get("/api/usuarios").param("perfil", "LEITOR").header("Authorization", token))
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.conteudo[0].login").value("joao.lima"));
    }
}
