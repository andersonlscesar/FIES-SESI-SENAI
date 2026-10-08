package br.org.fies.stbp.painel;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.org.fies.stbp.TesteIntegracao;
import br.org.fies.stbp.usuario.Perfil;

class PainelSaidasIntegracaoTest extends TesteIntegracao {

    private String leitor;
    private long autorId;

    @BeforeEach
    void dados() throws Exception {
        leitor = tokenDe(criarUsuario("leitor", Perfil.LEITOR));
        autorId = criarUsuario("tecnico", Perfil.TECNICO).getId();
        // Período analisado: 2026-01-01 a 2026-03-31 (anterior: 2025-10-03 a 2025-12-31)
        saida("2026-01-10", "MANUTENCAO", SESI, SEDE, null, "Assistência Técnica XYZ", false, "Projetor Epson", "projetor  epson");
        saida("2026-01-25", "TEMPORARIO", SESI, SEDE, null, "assistência técnica  xyz", false, "Notebook");
        saida("2026-01-28", "EVENTO", SESI, CEFEM, SEDE, null, false, "Projetor Epson");
        saida("2026-03-05", "PERMANENTE", SENAI, SEDE, CETAF_EST, null, false, "Cadeira");
        saida("2026-03-06", "EVENTO", SESI, SEDE, CEFEM, null, true, "Na lixeira");
        saida("2025-12-15", "MANUTENCAO", SESI, SEDE, CEFEM, null, false, "Anterior", "Anterior");
    }

    /** Cria uma saída para uma unidade ({@code destino}) ou para um destino externo, com itens (descrições). */
    private void saida(String data, String tipo, long instituicao, long origem, Long destino, String externo,
            boolean lixeira, String... itens) {
        Long id = jdbc.queryForObject("""
                INSERT INTO saida_material (data, tipo, instituicao_id, origem_id, destino_id, destino_externo,
                    criado_por_id, excluido_em)
                VALUES (?::date, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, data, tipo, instituicao, origem, destino, externo, autorId,
                lixeira ? java.sql.Timestamp.valueOf("2026-03-07 10:00:00") : null);
        for (int i = 0; i < itens.length; i++) {
            jdbc.update("INSERT INTO saida_material_item (saida_id, ordem, descricao) VALUES (?, ?, ?)",
                    id, i + 1, itens[i]);
        }
    }

    @Test
    void consolidaOPeriodoEComparaComOAnterior() throws Exception {
        mvc.perform(get("/api/painel/saidas").param("dataInicial", "2026-01-01").param("dataFinal", "2026-03-31")
                        .header("Authorization", leitor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.periodoAnterior.inicio").value("2025-10-03"))
                // A saída na lixeira não conta
                .andExpect(jsonPath("$.resumo.saidas").value(4))
                .andExpect(jsonPath("$.resumo.itens").value(5))
                .andExpect(jsonPath("$.resumo.paraDestinoExterno").value(2))
                // SEDE, CEFEM e CETAF-EST; o destino externo não é unidade
                .andExpect(jsonPath("$.resumo.unidadesEnvolvidas").value(3))
                .andExpect(jsonPath("$.resumo.saidasAnterior").value(1))
                .andExpect(jsonPath("$.resumo.itensAnterior").value(2))
                .andExpect(jsonPath("$.porMes[*].mes", contains("2026-01", "2026-02", "2026-03")))
                .andExpect(jsonPath("$.porMes[*].saidas", contains(3, 0, 1)))
                .andExpect(jsonPath("$.porMes[*].itens", contains(4, 0, 1)))
                // Os cinco tipos sempre aparecem, na ordem do formulário
                .andExpect(jsonPath("$.porTipo[*].tipo",
                        contains("PERMANENTE", "TEMPORARIO", "MANUTENCAO", "EVENTO", "OUTRO")))
                .andExpect(jsonPath("$.porTipo[*].saidas", contains(1, 1, 1, 1, 0)))
                .andExpect(jsonPath("$.porInstituicao[0].nome").value("SESI"))
                .andExpect(jsonPath("$.porInstituicao[0].saidas").value(3))
                .andExpect(jsonPath("$.principaisOrigens[0].nome").value("SEDE"))
                .andExpect(jsonPath("$.principaisOrigens[0].saidas").value(3))
                // Grafias diferentes do mesmo destino externo contam juntas
                .andExpect(jsonPath("$.principaisDestinos[0].nome").value("Assistência Técnica XYZ"))
                .andExpect(jsonPath("$.principaisDestinos[0].externo").value(true))
                .andExpect(jsonPath("$.principaisDestinos[0].saidas").value(2))
                .andExpect(jsonPath("$.principaisDestinos[0].itens").value(3))
                .andExpect(jsonPath("$.principaisDestinos[1].externo").value(false))
                .andExpect(jsonPath("$.principaisDestinos.length()").value(3))
                .andExpect(jsonPath("$.principaisRotas[0].origem").value("SEDE"))
                .andExpect(jsonPath("$.principaisRotas[0].destino").value("Assistência Técnica XYZ"))
                .andExpect(jsonPath("$.principaisRotas[0].destinoExterno").value(true))
                .andExpect(jsonPath("$.principaisEmissores[0].nome").value("Usuário tecnico"))
                .andExpect(jsonPath("$.principaisEmissores[0].saidas").value(4))
                .andExpect(jsonPath("$.materiaisMaisFrequentes[0].descricao").value("Projetor Epson"))
                .andExpect(jsonPath("$.materiaisMaisFrequentes[0].itens").value(3))
                .andExpect(jsonPath("$.materiaisMaisFrequentes[0].saidas").value(2));
    }

    @Test
    void filtraPorInstituicaoEUsaOsUltimos12MesesSemDatas() throws Exception {
        mvc.perform(get("/api/painel/saidas").param("dataInicial", "2026-01-01").param("dataFinal", "2026-03-31")
                        .param("instituicaoId", String.valueOf(SENAI)).header("Authorization", leitor))
                .andExpect(jsonPath("$.resumo.saidas").value(1))
                .andExpect(jsonPath("$.resumo.paraDestinoExterno").value(0))
                .andExpect(jsonPath("$.porInstituicao[*].nome", contains("SENAI")));
        mvc.perform(get("/api/painel/saidas").header("Authorization", leitor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.porMes.length()").value(12));
    }

    @Test
    void recusaPeriodoInvertidoEExigeLogin() throws Exception {
        mvc.perform(get("/api/painel/saidas").param("dataInicial", "2026-03-01").param("dataFinal", "2026-01-01")
                        .header("Authorization", leitor))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(get("/api/painel/saidas")).andExpect(status().isUnauthorized());
    }
}
