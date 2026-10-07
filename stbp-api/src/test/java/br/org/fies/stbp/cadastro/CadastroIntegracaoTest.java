package br.org.fies.stbp.cadastro;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import br.org.fies.stbp.TesteIntegracao;
import br.org.fies.stbp.usuario.Perfil;

class CadastroIntegracaoTest extends TesteIntegracao {

    /** Menor PNG válido (1x1 pixel). */
    private static final byte[] PNG = java.util.Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");

    private String admin;
    private String tecnico;

    @BeforeEach
    void criarUsuarios() throws Exception {
        admin = tokenDe(criarUsuario("admin", Perfil.ADMIN));
        tecnico = tokenDe(criarUsuario("tecnico", Perfil.TECNICO));
    }

    private static MockMultipartFile arquivo(byte[] dados) {
        return new MockMultipartFile("arquivo", "logo.png", "image/png", dados);
    }

    @Test
    void listasDeApoioAoFormulario() throws Exception {
        mvc.perform(get("/api/unidades").param("instituicaoId", String.valueOf(SENAI)).header("Authorization", tecnico))
                .andExpect(jsonPath("$[*].nome", contains("CETAF-AJU", "CETAF-EST", "SEDE")))
                .andExpect(jsonPath("$[*].nome", not(hasItem("CEFEM"))));
        mvc.perform(get("/api/instituicoes").header("Authorization", tecnico))
                .andExpect(jsonPath("$[*].nome", contains("SENAI", "SESI")))
                .andExpect(jsonPath("$[0].logoUrl").value(nullValue()));
        mvc.perform(get("/api/motivos").header("Authorization", tecnico))
                .andExpect(jsonPath("$[0].codigo").value("TRANSFERENCIA_ENTRE_FILIAIS"))
                .andExpect(jsonPath("$[0].tipo").value("DEFINITIVA"));
    }

    @Test
    void adminCadastraRenomeiaEExcluiInstituicao() throws Exception {
        mvc.perform(post("/api/instituicoes").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(json("nome", "  iel  ")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.nome").value("IEL"));

        mvc.perform(post("/api/instituicoes").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(json("nome", "Sesi")))
                .andExpect(status().isConflict());

        mvc.perform(put("/api/instituicoes/3").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(json("nome", "Instituto Euvaldo Lodi")))
                .andExpect(jsonPath("$.nome").value("INSTITUTO EUVALDO LODI"));

        mvc.perform(delete("/api/instituicoes/3").header("Authorization", admin)).andExpect(status().isNoContent());
        mvc.perform(get("/api/instituicoes/3").header("Authorization", admin)).andExpect(status().isNotFound());
    }

    @Test
    void tecnicoNaoAlteraCadastros() throws Exception {
        mvc.perform(post("/api/instituicoes").header("Authorization", tecnico).contentType(MediaType.APPLICATION_JSON)
                        .content(json("nome", "IEL")))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/unidades/{id}", CEFEM).header("Authorization", tecnico))
                .andExpect(status().isForbidden());
        mvc.perform(multipart(HttpMethod.PUT, "/api/instituicoes/1/logo").file(arquivo(PNG))
                        .header("Authorization", tecnico))
                .andExpect(status().isForbidden());
    }

    @Test
    void naoExcluiCadastroUsadoEmTransferencias() throws Exception {
        jdbc.update("INSERT INTO transferencia (data, motivo, instituicao_id, origem_id, destino_id, responsavel_envio, "
                + "responsavel_recebimento, criado_por_id) VALUES (current_date, 'MANUTENCAO', 1, 1, 3, 'A', 'B', "
                + "(SELECT min(id) FROM usuario))");

        mvc.perform(delete("/api/instituicoes/{id}", SESI).header("Authorization", admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        "A instituição possui transferências e não pode ser excluída. Bloqueie-a para impedir novos usos"));
        mvc.perform(delete("/api/unidades/{id}", CEFEM).header("Authorization", admin))
                .andExpect(status().isConflict());
        // Sem transferências: pode excluir (os vínculos com unidades são removidos junto)
        mvc.perform(delete("/api/instituicoes/{id}", SENAI).header("Authorization", admin))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/unidades/{id}", CETAF_AJU).header("Authorization", admin))
                .andExpect(jsonPath("$.instituicaoIds", contains((int) SESI)));
    }

    @Test
    void adminCadastraEAlteraUnidade() throws Exception {
        mvc.perform(post("/api/unidades").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\": \"sesi lagarto\", \"instituicaoIds\": [1]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.nome").value("SESI LAGARTO"))
                .andExpect(jsonPath("$.instituicaoIds", contains(1)));

        mvc.perform(put("/api/unidades/5").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\": \"Lagarto\", \"instituicaoIds\": [1, 2]}"))
                .andExpect(jsonPath("$.nome").value("LAGARTO"))
                .andExpect(jsonPath("$.instituicaoIds", contains(1, 2)));

        mvc.perform(post("/api/unidades").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\": \"cefem\", \"instituicaoIds\": [1]}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/unidades").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\": \"Nova\", \"instituicaoIds\": []}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.instituicaoIds").value("Informe ao menos uma instituição"));
        mvc.perform(post("/api/unidades").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\": \"Nova\", \"instituicaoIds\": [99]}"))
                .andExpect(status().isUnprocessableContent());
    }

    @Test
    void enviaConsultaERemoveLogo() throws Exception {
        mvc.perform(multipart(HttpMethod.PUT, "/api/instituicoes/1/logo").file(arquivo(PNG))
                        .header("Authorization", admin))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/instituicoes/1").header("Authorization", admin))
                .andExpect(jsonPath("$.logoUrl").value("/api/instituicoes/1/logo"));

        // A imagem é pública (sem token), para uso direto em <img src>
        mvc.perform(get("/api/instituicoes/1/logo"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(content().bytes(PNG));

        mvc.perform(delete("/api/instituicoes/1/logo").header("Authorization", admin))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/instituicoes/1/logo")).andExpect(status().isNotFound());
    }

    @Test
    void recusaLogoQueNaoSejaPngOuJpeg() throws Exception {
        mvc.perform(multipart(HttpMethod.PUT, "/api/instituicoes/1/logo")
                        .file(arquivo("<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes()))
                        .header("Authorization", admin))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("A imagem deve ser PNG ou JPEG"));
    }

    @Test
    void fotoDaUnidadeEReduzidaEApareceNasTransferencias() throws Exception {
        byte[] fotoGrande = ImagemTest.imagem("png", 3000, 1500);
        mvc.perform(multipart(HttpMethod.PUT, "/api/unidades/{id}/imagem", CEFEM)
                        .file(new MockMultipartFile("arquivo", "cefem.png", "image/png", fotoGrande))
                        .header("Authorization", admin))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/unidades/{id}", CEFEM).header("Authorization", tecnico))
                .andExpect(jsonPath("$.imagemUrl").value("/api/unidades/" + CEFEM + "/imagem"));
        mvc.perform(get("/api/unidades/{id}", SEDE).header("Authorization", tecnico))
                .andExpect(jsonPath("$.imagemUrl").value(nullValue()));

        // Pública, em JPEG e reduzida para 1200 px no lado maior
        byte[] gravada = mvc.perform(get("/api/unidades/{id}/imagem", CEFEM))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG))
                .andReturn().getResponse().getContentAsByteArray();
        var imagem = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(gravada));
        org.assertj.core.api.Assertions.assertThat(imagem.getWidth()).isEqualTo(1200);
        org.assertj.core.api.Assertions.assertThat(imagem.getHeight()).isEqualTo(600);

        // As transferências trazem a foto da unidade de origem e de destino
        mvc.perform(post("/api/transferencias").header("Authorization", tecnico).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"data": "2026-10-06", "motivo": "MANUTENCAO", "instituicaoId": 1, "origemId": 1,
                                 "destinoId": 3, "responsavelEnvio": "A", "responsavelRecebimento": "B",
                                 "itens": [{"descricao": "Notebook"}]}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.destino.imagemUrl").value("/api/unidades/" + CEFEM + "/imagem"))
                .andExpect(jsonPath("$.origem.imagemUrl").value(nullValue()));
        mvc.perform(get("/api/transferencias").header("Authorization", tecnico))
                .andExpect(jsonPath("$.conteudo[0].destino.imagemUrl").value("/api/unidades/" + CEFEM + "/imagem"));

        mvc.perform(delete("/api/unidades/{id}/imagem", CEFEM).header("Authorization", admin))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/unidades/{id}/imagem", CEFEM)).andExpect(status().isNotFound());
    }

    private static final String TRANSFERENCIA_SESI = """
            {"data": "2026-10-06", "motivo": "MANUTENCAO", "instituicaoId": 1, "origemId": 1, "destinoId": 3,
             "responsavelEnvio": "A", "responsavelRecebimento": "B", "itens": [{"descricao": "Notebook"}]}
            """;

    @Test
    void instituicaoEmUsoNaoEExcluidaMasPodeSerBloqueada() throws Exception {
        String criada = mvc.perform(post("/api/transferencias").header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(TRANSFERENCIA_SESI))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long transferenciaId = ((Number) com.jayway.jsonpath.JsonPath.read(criada, "$.id")).longValue();

        mvc.perform(get("/api/instituicoes/{id}", SESI).header("Authorization", admin))
                .andExpect(jsonPath("$.emUso").value(true))
                .andExpect(jsonPath("$.ativa").value(true));
        mvc.perform(get("/api/instituicoes/{id}", SENAI).header("Authorization", admin))
                .andExpect(jsonPath("$.emUso").value(false));

        mvc.perform(delete("/api/instituicoes/{id}", SESI).header("Authorization", admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        "A instituição possui transferências e não pode ser excluída. Bloqueie-a para impedir novos usos"));

        mvc.perform(post("/api/instituicoes/{id}/bloquear", SESI).header("Authorization", tecnico))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/instituicoes/{id}/bloquear", SESI).header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativa").value(false));
        mvc.perform(post("/api/instituicoes/{id}/bloquear", SESI).header("Authorization", admin))
                .andExpect(status().isUnprocessableContent());

        // Bloqueada: não entra em transferências novas...
        mvc.perform(post("/api/transferencias").header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(TRANSFERENCIA_SESI))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("A instituição SESI está bloqueada para uso"));
        // ...mas o histórico continua editável sem trocar a instituição, e o termo continua sendo emitido
        mvc.perform(put("/api/transferencias/{id}", transferenciaId).header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(TRANSFERENCIA_SESI))
                .andExpect(status().isOk());
        mvc.perform(get("/api/transferencias/{id}/termo", transferenciaId).header("Authorization", tecnico))
                .andExpect(status().isOk());

        mvc.perform(post("/api/instituicoes/{id}/desbloquear", SESI).header("Authorization", admin))
                .andExpect(jsonPath("$.ativa").value(true));
        mvc.perform(post("/api/transferencias").header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(TRANSFERENCIA_SESI))
                .andExpect(status().isCreated());
    }

    @Test
    void unidadeEmUsoNaoEExcluidaMasPodeSerBloqueada() throws Exception {
        String criada = mvc.perform(post("/api/transferencias").header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(TRANSFERENCIA_SESI))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long transferenciaId = ((Number) com.jayway.jsonpath.JsonPath.read(criada, "$.id")).longValue();

        mvc.perform(get("/api/unidades/{id}", CEFEM).header("Authorization", admin))
                .andExpect(jsonPath("$.emUso").value(true))
                .andExpect(jsonPath("$.ativa").value(true));
        mvc.perform(delete("/api/unidades/{id}", CEFEM).header("Authorization", admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        "A unidade possui transferências e não pode ser excluída. Bloqueie-a para impedir novos usos"));

        mvc.perform(post("/api/unidades/{id}/bloquear", CEFEM).header("Authorization", tecnico))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/unidades/{id}/bloquear", CEFEM).header("Authorization", admin))
                .andExpect(jsonPath("$.ativa").value(false));

        // Bloqueada: não pode ser origem/destino de transferência nova, mas o histórico continua editável
        mvc.perform(post("/api/transferencias").header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(TRANSFERENCIA_SESI))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("A unidade CEFEM está bloqueada para uso"));
        mvc.perform(put("/api/transferencias/{id}", transferenciaId).header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(TRANSFERENCIA_SESI))
                .andExpect(status().isOk());

        mvc.perform(post("/api/unidades/{id}/desbloquear", CEFEM).header("Authorization", admin))
                .andExpect(jsonPath("$.ativa").value(true));
    }

    @Test
    void tecnicoNaoEnviaFotoDeUnidade() throws Exception {
        mvc.perform(multipart(HttpMethod.PUT, "/api/unidades/{id}/imagem", CEFEM).file(arquivo(PNG))
                        .header("Authorization", tecnico))
                .andExpect(status().isForbidden());
    }
}
