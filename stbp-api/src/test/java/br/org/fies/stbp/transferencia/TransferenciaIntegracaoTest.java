package br.org.fies.stbp.transferencia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import com.jayway.jsonpath.JsonPath;

import br.org.fies.stbp.TesteIntegracao;
import br.org.fies.stbp.usuario.Perfil;

class TransferenciaIntegracaoTest extends TesteIntegracao {

    private String tecnico;
    private String outroTecnico;
    private String admin;
    private String leitor;

    @BeforeEach
    void criarUsuarios() throws Exception {
        tecnico = tokenDe(criarUsuario("tecnico", Perfil.TECNICO));
        outroTecnico = tokenDe(criarUsuario("outro", Perfil.TECNICO));
        admin = tokenDe(criarUsuario("admin", Perfil.ADMIN));
        leitor = tokenDe(criarUsuario("leitor", Perfil.LEITOR));
    }

    private static String transferencia(long instituicao, long origem, long destino, String itensJson) {
        return """
                {"data": "2026-10-06", "motivo": "TRANSFERENCIA_ENTRE_FILIAIS", "instituicaoId": %d,
                 "origemId": %d, "destinoId": %d,
                 "responsavelEnvio": "  fabrizio de   farias ", "responsavelRecebimento": "débora noronha",
                 "itens": %s}
                """.formatted(instituicao, origem, destino, itensJson);
    }

    private static final String DOIS_ITENS = """
            [{"descricao": "notebook Dell", "patrimonio": "36102", "observacao": "com fonte"},
             {"descricao": "teclado", "patrimonio": " S/P ", "observacao": "  "}]
            """;

    private long criar(String token, String corpo) throws Exception {
        String resposta = mvc.perform(post("/api/transferencias").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(resposta, "$.id")).longValue();
    }

    @Test
    void tecnicoCriaTransferenciaComTextosNormalizados() throws Exception {
        mvc.perform(post("/api/transferencias").header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(transferencia(SESI, SEDE, CEFEM, DOIS_ITENS)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.responsavelEnvio").value("Fabrizio De Farias"))
                .andExpect(jsonPath("$.responsavelRecebimento").value("Débora Noronha"))
                .andExpect(jsonPath("$.origem.nome").value("SEDE"))
                .andExpect(jsonPath("$.destino.nome").value("CEFEM"))
                .andExpect(jsonPath("$.criadoPor.nome").value("Usuário tecnico"))
                .andExpect(jsonPath("$.podeAlterar").value(true))
                .andExpect(jsonPath("$.itens[*].ordem", contains(1, 2)))
                .andExpect(jsonPath("$.itens[0].descricao").value("Notebook Dell"))
                .andExpect(jsonPath("$.itens[0].patrimonio").value("36102"))
                .andExpect(jsonPath("$.itens[1].patrimonio").value(nullValue()))
                .andExpect(jsonPath("$.itens[1].observacao").value(nullValue()));
    }

    @Test
    void leitorConsultaMasNaoCria() throws Exception {
        long id = criar(tecnico, transferencia(SESI, SEDE, CEFEM, DOIS_ITENS));

        mvc.perform(get("/api/transferencias").header("Authorization", leitor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.conteudo[0].quantidadeItens").value(2));
        mvc.perform(get("/api/transferencias/{id}", id).header("Authorization", leitor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.podeAlterar").value(false));
        mvc.perform(post("/api/transferencias").header("Authorization", leitor)
                        .contentType(MediaType.APPLICATION_JSON).content(transferencia(SESI, SEDE, CEFEM, DOIS_ITENS)))
                .andExpect(status().isForbidden());
    }

    @Test
    void validaCamposItensEUnidadesDaInstituicao() throws Exception {
        mvc.perform(post("/api/transferencias").header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(transferencia(SESI, SEDE, CEFEM, "[]")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.itens").value("Informe ao menos um item"));

        mvc.perform(post("/api/transferencias").header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(transferencia(SESI, SEDE, CEFEM, "[{\"descricao\": \"\"}]")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos['itens[0].descricao']").value("Informe a descrição do item"));

        // CEFEM não pertence ao SENAI
        mvc.perform(post("/api/transferencias").header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(transferencia(SENAI, SEDE, CEFEM, DOIS_ITENS)))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail")
                        .value("As unidades de origem e destino devem pertencer à instituição SENAI"));
    }

    @Test
    void edicaoAtualizaRemoveEIncluiItensPelaIdentificacao() throws Exception {
        long id = criar(tecnico, transferencia(SESI, SEDE, CEFEM, DOIS_ITENS));
        String detalhe = mvc.perform(get("/api/transferencias/{id}", id).header("Authorization", tecnico))
                .andReturn().getResponse().getContentAsString();
        long notebook = ((Number) JsonPath.read(detalhe, "$.itens[0].id")).longValue();

        // Remove o teclado, inclui um mouse antes do notebook e altera o notebook
        String itens = """
                [{"descricao": "mouse"},
                 {"id": %d, "descricao": "Notebook Dell Latitude", "patrimonio": "36102"}]
                """.formatted(notebook);
        mvc.perform(put("/api/transferencias/{id}", id).header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(transferencia(SESI, SEDE, CETAF_AJU, itens)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.destino.nome").value("CETAF-AJU"))
                .andExpect(jsonPath("$.itens[*].descricao", contains("Mouse", "Notebook Dell Latitude")))
                .andExpect(jsonPath("$.itens[*].ordem", contains(1, 2)))
                .andExpect(jsonPath("$.itens[1].id").value(notebook));
    }

    @Test
    void itemDeOutraTransferenciaNaoPodeSerReferenciado() throws Exception {
        long a = criar(tecnico, transferencia(SESI, SEDE, CEFEM, DOIS_ITENS));
        long b = criar(tecnico, transferencia(SESI, SEDE, CEFEM, DOIS_ITENS));
        String detalheB = mvc.perform(get("/api/transferencias/{id}", b).header("Authorization", tecnico))
                .andReturn().getResponse().getContentAsString();
        long itemDeB = ((Number) JsonPath.read(detalheB, "$.itens[0].id")).longValue();

        mvc.perform(put("/api/transferencias/{id}", a).header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(transferencia(SESI, SEDE, CEFEM, "[{\"id\": %d, \"descricao\": \"x\"}]".formatted(itemDeB))))
                .andExpect(status().isUnprocessableContent());
    }

    @Test
    void tecnicoSoAlteraAsPropriasEAdminAlteraTodas() throws Exception {
        long id = criar(tecnico, transferencia(SESI, SEDE, CEFEM, DOIS_ITENS));

        mvc.perform(put("/api/transferencias/{id}", id).header("Authorization", outroTecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(transferencia(SESI, SEDE, CEFEM, DOIS_ITENS)))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/transferencias/{id}", id).header("Authorization", outroTecnico))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/transferencias/{id}", id).header("Authorization", outroTecnico))
                .andExpect(jsonPath("$.podeAlterar").value(false));

        mvc.perform(put("/api/transferencias/{id}", id).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(transferencia(SESI, SEDE, CEFEM, DOIS_ITENS)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.criadoPor.nome").value("Usuário tecnico"));
    }

    @Test
    void cicloDaLixeira() throws Exception {
        long id = criar(tecnico, transferencia(SESI, SEDE, CEFEM, DOIS_ITENS));

        mvc.perform(delete("/api/transferencias/{id}/definitivo", id).header("Authorization", tecnico))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(delete("/api/transferencias/{id}", id).header("Authorization", tecnico))
                .andExpect(status().isNoContent());

        // Some da listagem; só o autor e administradores enxergam na lixeira
        mvc.perform(get("/api/transferencias").header("Authorization", tecnico))
                .andExpect(jsonPath("$.totalElementos").value(0));
        mvc.perform(get("/api/transferencias/{id}", id).header("Authorization", leitor))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/transferencias/{id}", id).header("Authorization", outroTecnico))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/transferencias/lixeira").header("Authorization", outroTecnico))
                .andExpect(jsonPath("$.totalElementos").value(0));
        mvc.perform(get("/api/transferencias/lixeira").header("Authorization", tecnico))
                .andExpect(jsonPath("$.conteudo[0].id").value(id));
        mvc.perform(get("/api/transferencias/lixeira").header("Authorization", admin))
                .andExpect(jsonPath("$.conteudo[0].id").value(id));
        mvc.perform(get("/api/transferencias/lixeira").header("Authorization", leitor))
                .andExpect(status().isForbidden());

        mvc.perform(put("/api/transferencias/{id}", id).header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(transferencia(SESI, SEDE, CEFEM, DOIS_ITENS)))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("Restaure a transferência antes de editá-la"));

        mvc.perform(post("/api/transferencias/{id}/restaurar", id).header("Authorization", tecnico))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/transferencias").header("Authorization", tecnico))
                .andExpect(jsonPath("$.totalElementos").value(1));

        mvc.perform(delete("/api/transferencias/{id}", id).header("Authorization", tecnico));
        mvc.perform(delete("/api/transferencias/{id}/definitivo", id).header("Authorization", tecnico))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/transferencias/{id}", id).header("Authorization", tecnico))
                .andExpect(status().isNotFound());
    }

    @Test
    void itensAcompanhamATransferenciaNaLixeiraENaExclusao() throws Exception {
        long id = criar(tecnico, transferencia(SESI, SEDE, CEFEM, DOIS_ITENS));
        String contarItens = "SELECT count(*) FROM item WHERE transferencia_id = ?";

        // Na lixeira, os itens somem das buscas e do painel junto com a transferência, mas são guardados para restaurar
        mvc.perform(delete("/api/transferencias/{id}", id).header("Authorization", tecnico));
        mvc.perform(get("/api/transferencias").param("busca", "36102").header("Authorization", admin))
                .andExpect(jsonPath("$.totalElementos").value(0));
        mvc.perform(get("/api/painel").param("dataInicial", "2000-01-01").header("Authorization", admin))
                .andExpect(jsonPath("$.resumo.itens").value(0));
        assertThat(jdbc.queryForObject(contarItens, Long.class, id)).isEqualTo(2);

        mvc.perform(post("/api/transferencias/{id}/restaurar", id).header("Authorization", tecnico));
        mvc.perform(get("/api/transferencias/{id}", id).header("Authorization", tecnico))
                .andExpect(jsonPath("$.itens[*].descricao", contains("Notebook Dell", "Teclado")));

        // Na exclusão definitiva, os itens são apagados do banco com o termo
        mvc.perform(delete("/api/transferencias/{id}", id).header("Authorization", tecnico));
        mvc.perform(delete("/api/transferencias/{id}/definitivo", id).header("Authorization", tecnico))
                .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject(contarItens, Long.class, id)).isZero();
    }

    @Test
    void buscaTextualRespeitaOsDemaisFiltros() throws Exception {
        long sesi = criar(tecnico, transferencia(SESI, SEDE, CEFEM, DOIS_ITENS));
        long senai = criar(outroTecnico, transferencia(SENAI, SEDE, CETAF_EST, DOIS_ITENS));

        // No sistema antigo, a busca anulava o filtro de instituição
        mvc.perform(get("/api/transferencias").param("busca", "notebook").param("instituicaoId", String.valueOf(SESI))
                        .header("Authorization", leitor))
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.conteudo[0].id").value(sesi));

        mvc.perform(get("/api/transferencias").param("busca", "36102").header("Authorization", leitor))
                .andExpect(jsonPath("$.totalElementos").value(2));
        mvc.perform(get("/api/transferencias").param("busca", "cetaf-est").header("Authorization", leitor))
                .andExpect(jsonPath("$.conteudo[*].id", contains((int) senai)));
        mvc.perform(get("/api/transferencias").param("busca", String.valueOf(senai)).header("Authorization", leitor))
                .andExpect(jsonPath("$.conteudo[*].id", hasItem((int) senai)));
        mvc.perform(get("/api/transferencias").param("busca", "filiais").header("Authorization", leitor))
                .andExpect(jsonPath("$.totalElementos").value(2));
        mvc.perform(get("/api/transferencias").param("minhas", "true").header("Authorization", tecnico))
                .andExpect(jsonPath("$.conteudo[*].id", contains((int) sesi)));
        mvc.perform(get("/api/transferencias").param("dataInicial", "2026-10-07").header("Authorization", leitor))
                .andExpect(jsonPath("$.totalElementos").value(0));
        mvc.perform(get("/api/transferencias").param("dataInicial", "2026-10-06").param("dataFinal", "2026-10-06")
                        .header("Authorization", leitor))
                .andExpect(jsonPath("$.totalElementos").value(2));
    }

    @Test
    void listagemOrdenaPorNumeroDecrescenteERejeitaOrdenacaoInvalida() throws Exception {
        long primeira = criar(tecnico, transferencia(SESI, SEDE, CEFEM, DOIS_ITENS));
        long segunda = criar(tecnico, transferencia(SESI, SEDE, CEFEM, DOIS_ITENS));

        mvc.perform(get("/api/transferencias").header("Authorization", leitor))
                .andExpect(jsonPath("$.conteudo[*].id", contains((int) segunda, (int) primeira)));
        mvc.perform(get("/api/transferencias").param("sort", "inexistente").header("Authorization", leitor))
                .andExpect(status().isBadRequest());
    }

    @Test
    void autoresListaQuemJaCriouTransferencias() throws Exception {
        criar(tecnico, transferencia(SESI, SEDE, CEFEM, DOIS_ITENS));

        mvc.perform(get("/api/transferencias/autores").header("Authorization", leitor))
                .andExpect(jsonPath("$[*].nome", contains("Usuário tecnico")));
    }
}
