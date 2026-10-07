package br.org.fies.stbp.painel;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.org.fies.stbp.TesteIntegracao;
import br.org.fies.stbp.usuario.Perfil;

class PainelIntegracaoTest extends TesteIntegracao {

    private String leitor;
    private long autorId;

    @BeforeEach
    void dados() throws Exception {
        leitor = tokenDe(criarUsuario("leitor", Perfil.LEITOR));
        autorId = criarUsuario("tecnico", Perfil.TECNICO).getId();
        // Período analisado: 2026-01-01 a 2026-03-31 (90 dias; anterior: 2025-10-03 a 2025-12-31)
        transferencia("2026-01-10", "TRANSFERENCIA_ENTRE_FILIAIS", SESI, SEDE, CEFEM, false,
                "Notebook Dell", "100", "notebook  dell", "101", "Monitor", null);
        transferencia("2026-01-20", "MANUTENCAO", SESI, CEFEM, SEDE, false, "Notebook Dell", "102");
        transferencia("2026-03-05", "TRANSFERENCIA_ENTRE_FILIAIS", SENAI, SEDE, CETAF_EST, false, "Impressora", null);
        transferencia("2026-03-06", "BAIXA_DESCARTE", SESI, SEDE, CEFEM, true, "Na lixeira", "999");
        transferencia("2025-12-15", "MANUTENCAO", SESI, SEDE, CEFEM, false, "Anterior", "1");
        transferencia("2025-06-01", "MANUTENCAO", SESI, SEDE, CEFEM, false, "Fora dos dois períodos", "2");
    }

    /** Cria uma transferência com itens (pares descrição/patrimônio; patrimônio null = S/P). */
    private void transferencia(String data, String motivo, long instituicao, long origem, long destino, boolean lixeira,
            String... itens) {
        Long id = jdbc.queryForObject("""
                INSERT INTO transferencia (data, motivo, instituicao_id, origem_id, destino_id, responsavel_envio,
                    responsavel_recebimento, criado_por_id, excluido_em)
                VALUES (?::date, ?, ?, ?, ?, 'A', 'B', ?, ?) RETURNING id
                """, Long.class, data, motivo, instituicao, origem, destino, autorId,
                lixeira ? java.sql.Timestamp.valueOf("2026-03-07 10:00:00") : null);
        for (int i = 0; i < itens.length; i += 2) {
            jdbc.update("INSERT INTO item (transferencia_id, ordem, descricao, patrimonio) VALUES (?, ?, ?, ?)",
                    id, i / 2 + 1, itens[i], itens[i + 1]);
        }
    }

    @Test
    void consolidaOPeriodoEComparaComOAnterior() throws Exception {
        mvc.perform(get("/api/painel").param("dataInicial", "2026-01-01").param("dataFinal", "2026-03-31")
                        .header("Authorization", leitor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.periodoAnterior.inicio").value("2025-10-03"))
                .andExpect(jsonPath("$.periodoAnterior.fim").value("2025-12-31"))
                // A transferência na lixeira não conta
                .andExpect(jsonPath("$.resumo.transferencias").value(3))
                .andExpect(jsonPath("$.resumo.itens").value(5))
                .andExpect(jsonPath("$.resumo.itensSemPatrimonio").value(2))
                .andExpect(jsonPath("$.resumo.unidadesEnvolvidas").value(3))
                .andExpect(jsonPath("$.resumo.transferenciasAnterior").value(1))
                .andExpect(jsonPath("$.resumo.itensAnterior").value(1))
                // Fevereiro sem movimento aparece com zero
                .andExpect(jsonPath("$.porMes[*].mes", contains("2026-01", "2026-02", "2026-03")))
                .andExpect(jsonPath("$.porMes[*].transferencias", contains(2, 0, 1)))
                .andExpect(jsonPath("$.porMes[*].itens", contains(4, 0, 1)))
                // Os quatro motivos sempre aparecem, na ordem do sistema
                .andExpect(jsonPath("$.porMotivo[*].motivo",
                        contains("TRANSFERENCIA_ENTRE_FILIAIS", "BAIXA_DESCARTE", "MANUTENCAO", "EMPRESTIMO_TEMPORARIO")))
                .andExpect(jsonPath("$.porMotivo[*].transferencias", contains(2, 0, 1, 0)))
                .andExpect(jsonPath("$.porInstituicao[0].nome").value("SESI"))
                .andExpect(jsonPath("$.porInstituicao[0].transferencias").value(2))
                .andExpect(jsonPath("$.principaisOrigens[0].nome").value("SEDE"))
                .andExpect(jsonPath("$.principaisOrigens[0].transferencias").value(2))
                .andExpect(jsonPath("$.principaisRotas[0].origem").value("SEDE"))
                .andExpect(jsonPath("$.principaisRotas[0].destino").value("CEFEM"))
                .andExpect(jsonPath("$.principaisEmissores[0].nome").value("Usuário tecnico"))
                // "Notebook Dell" e "notebook  dell" são o mesmo bem; aparece a grafia mais frequente
                .andExpect(jsonPath("$.bensMaisTransferidos[0].descricao").value("Notebook Dell"))
                .andExpect(jsonPath("$.bensMaisTransferidos[0].itens").value(3))
                .andExpect(jsonPath("$.bensMaisTransferidos[0].transferencias").value(2));
    }

    @Test
    void filtraPorInstituicao() throws Exception {
        mvc.perform(get("/api/painel").param("dataInicial", "2026-01-01").param("dataFinal", "2026-03-31")
                        .param("instituicaoId", String.valueOf(SENAI)).header("Authorization", leitor))
                .andExpect(jsonPath("$.resumo.transferencias").value(1))
                .andExpect(jsonPath("$.resumo.itens").value(1))
                .andExpect(jsonPath("$.porInstituicao[*].nome", contains("SENAI")));
    }

    @Test
    void semDatasUsaOsUltimos12Meses() throws Exception {
        mvc.perform(get("/api/painel").header("Authorization", leitor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.porMes.length()").value(12));
    }

    @Test
    void recusaPeriodoInvertidoEExigeLogin() throws Exception {
        mvc.perform(get("/api/painel").param("dataInicial", "2026-03-01").param("dataFinal", "2026-01-01")
                        .header("Authorization", leitor))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(get("/api/painel")).andExpect(status().isUnauthorized());
    }
}
