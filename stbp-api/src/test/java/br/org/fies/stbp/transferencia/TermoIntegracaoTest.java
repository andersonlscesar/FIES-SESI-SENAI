package br.org.fies.stbp.transferencia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import com.jayway.jsonpath.JsonPath;

import br.org.fies.stbp.TesteIntegracao;
import br.org.fies.stbp.usuario.Perfil;

class TermoIntegracaoTest extends TesteIntegracao {

    private String tecnico;
    private String leitor;

    @BeforeEach
    void criarUsuarios() throws Exception {
        tecnico = tokenDe(criarUsuario("tecnico", Perfil.TECNICO));
        leitor = tokenDe(criarUsuario("leitor", Perfil.LEITOR));
    }

    private long criar(String motivo, int quantidadeItens) throws Exception {
        String itens = IntStream.rangeClosed(1, quantidadeItens)
                .mapToObj(i -> i == 1
                        ? "{\"descricao\": \"Notebook Dell\", \"patrimonio\": \"s/p\", \"observacao\": \"Com fonte\"}"
                        : "{\"descricao\": \"Monitor " + i + "\", \"patrimonio\": \"" + (30000 + i) + "\"}")
                .collect(Collectors.joining(",", "[", "]"));
        String corpo = """
                {"data": "2026-10-06", "motivo": "%s", "instituicaoId": 1, "origemId": 1, "destinoId": 3,
                 "responsavelEnvio": "fabrizio de farias", "responsavelRecebimento": "débora noronha", "itens": %s}
                """.formatted(motivo, itens);
        String resposta = mvc.perform(post("/api/transferencias").header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(resposta, "$.id")).longValue();
    }

    private byte[] baixar(long id, String formato) throws Exception {
        return mvc.perform(get("/api/transferencias/{id}/termo", id).param("formato", formato)
                        .header("Authorization", leitor))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andReturn().getResponse().getContentAsByteArray();
    }

    private static String texto(PDDocument pdf) throws Exception {
        return new PDFTextStripper().getText(pdf);
    }

    @Test
    void termoEmRetratoTrazOsDadosDaTransferencia() throws Exception {
        long id = criar("MANUTENCAO", 2);

        try (var pdf = Loader.loadPDF(baixar(id, "RETRATO"))) {
            assertThat(pdf.getNumberOfPages()).isEqualTo(1);
            var pagina = pdf.getPage(0).getMediaBox();
            assertThat(pagina.getWidth()).isLessThan(pagina.getHeight());

            String texto = texto(pdf);
            assertThat(texto).contains("TERMO DE TRANSFERÊNCIA DE BENS PATRIMONIAIS", "DE: SEDE", "PARA: CEFEM",
                    "RESPONSÁVEL: Fabrizio De Farias", "RESPONSÁVEL: Débora Noronha", "DATA: 06/10/2026",
                    "Notebook Dell", "S/P", "Com fonte", "Monitor 2", "30002", "FM-008-SCI-04",
                    "Termo nº " + id + " · página 1 de 1");
            // O "X" fica no quadro do motivo escolhido
            assertThat(texto).containsPattern("\\(\\s*X\\s*\\)\\s*MANUTENÇÃO");
            assertThat(texto).doesNotContainPattern("\\(\\s*X\\s*\\)\\s*BAIXA/DESCARTE");
        }
    }

    @Test
    void termoEmPaisagemTemDuasViasPorFolha() throws Exception {
        long id = criar("TRANSFERENCIA_ENTRE_FILIAIS", 2);

        try (var pdf = Loader.loadPDF(baixar(id, "PAISAGEM"))) {
            var pagina = pdf.getPage(0).getMediaBox();
            assertThat(pagina.getWidth()).isGreaterThan(pagina.getHeight());
            assertThat(texto(pdf).split("TERMO DE TRANSFERÊNCIA DE BENS PATRIMONIAIS", -1)).hasSize(3);
        }
    }

    @Test
    void muitosItensQuebramEmVariasPaginasRepetindoCabecalhoERodape() throws Exception {
        long id = criar("TRANSFERENCIA_ENTRE_FILIAIS", 60);

        try (var pdf = Loader.loadPDF(baixar(id, "RETRATO"))) {
            int paginas = pdf.getNumberOfPages();
            assertThat(paginas).isGreaterThan(1);
            String texto = texto(pdf);
            assertThat(texto.split("FM-008-SCI-04", -1)).hasSize(paginas + 1);
            assertThat(texto).contains("Monitor 60", "página " + paginas + " de " + paginas);
        }
    }

    @Test
    void nomeDoArquivoEDownload() throws Exception {
        long id = criar("MANUTENCAO", 1);

        mvc.perform(get("/api/transferencias/{id}/termo", id).header("Authorization", leitor))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.startsWith("inline; filename=\"Termo " + id + " - SEDE - CEFEM.pdf\"")));
        mvc.perform(get("/api/transferencias/{id}/termo", id).param("download", "true").header("Authorization", leitor))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment;")));
    }

    @Test
    void termoDeTransferenciaNaLixeiraSegueARegraDeVisibilidade() throws Exception {
        long id = criar("MANUTENCAO", 1);
        mvc.perform(delete("/api/transferencias/{id}", id).header("Authorization", tecnico))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/transferencias/{id}/termo", id).header("Authorization", leitor))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/transferencias/{id}/termo", id).header("Authorization", tecnico))
                .andExpect(status().isOk());
    }
}
