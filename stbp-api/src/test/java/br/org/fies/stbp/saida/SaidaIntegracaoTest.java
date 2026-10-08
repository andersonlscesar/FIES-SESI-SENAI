package br.org.fies.stbp.saida;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import com.jayway.jsonpath.JsonPath;

import br.org.fies.stbp.TesteIntegracao;
import br.org.fies.stbp.usuario.Perfil;

class SaidaIntegracaoTest extends TesteIntegracao {

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

    private static final String DOIS_ITENS = """
            [{"descricao": "projetor epson", "areaSaida": "laboratório de elétrica", "areaEntrada": "auditório",
              "observacao": "Retorno previsto em 15/10/2026"},
             {"descricao": "cabo hdmi", "areaSaida": "  ", "areaEntrada": null}]
            """;

    private static String saida(String destino, String tipo, String itens) {
        return """
                {"data": "2026-10-07", "tipo": %s, "instituicaoId": 2, "origemId": 1, %s,
                 "portador": "joão da silva", "itens": %s}
                """.formatted(tipo, destino, itens);
    }

    private static String paraUnidade(long id) {
        return "\"destinoId\": " + id;
    }

    private static String paraExterno(String nome) {
        return "\"destinoExterno\": \"" + nome + "\"";
    }

    private long criar(String token, String corpo) throws Exception {
        String resposta = mvc.perform(post("/api/saidas").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(resposta, "$.id")).longValue();
    }

    @Test
    void criaComUnidadeDeDestinoENormalizaOsCampos() throws Exception {
        mvc.perform(post("/api/saidas").header("Authorization", tecnico).contentType(MediaType.APPLICATION_JSON)
                        .content(saida(paraUnidade(CETAF_EST), "\"TEMPORARIO\"", DOIS_ITENS)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipo").value("TEMPORARIO"))
                .andExpect(jsonPath("$.instituicao.nome").value("SENAI"))
                .andExpect(jsonPath("$.origem.nome").value("SEDE"))
                .andExpect(jsonPath("$.destino.nome").value("CETAF-EST"))
                .andExpect(jsonPath("$.destinoExterno").value(nullValue()))
                .andExpect(jsonPath("$.nomeDestino").value("CETAF-EST"))
                .andExpect(jsonPath("$.portador").value("João Da Silva"))
                .andExpect(jsonPath("$.itens[*].ordem", contains(1, 2)))
                .andExpect(jsonPath("$.itens[0].descricao").value("Projetor epson"))
                .andExpect(jsonPath("$.itens[0].areaSaida").value("Laboratório de elétrica"))
                .andExpect(jsonPath("$.itens[0].areaEntrada").value("Auditório"))
                .andExpect(jsonPath("$.itens[0].patrimonio").doesNotExist())
                .andExpect(jsonPath("$.itens[1].areaSaida").value(nullValue()))
                .andExpect(jsonPath("$.podeAlterar").value(true));
    }

    @Test
    void aceitaDestinoExternoEOutroTipoComDescricao() throws Exception {
        long id = criar(tecnico, saida(paraExterno("Assistência Técnica XYZ"), "\"OUTRO\", \"tipoOutro\": \"doação\"",
                DOIS_ITENS));
        mvc.perform(get("/api/saidas/{id}", id).header("Authorization", leitor))
                .andExpect(jsonPath("$.destino").value(nullValue()))
                .andExpect(jsonPath("$.destinoExterno").value("Assistência Técnica XYZ"))
                .andExpect(jsonPath("$.nomeDestino").value("Assistência Técnica XYZ"))
                .andExpect(jsonPath("$.tipo").value("OUTRO"))
                .andExpect(jsonPath("$.tipoOutro").value("Doação"));

        // A descrição de "outro" é descartada quando o tipo muda
        mvc.perform(put("/api/saidas/{id}", id).header("Authorization", tecnico)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(saida(paraExterno("Assistência Técnica XYZ"), "\"MANUTENCAO\", \"tipoOutro\": \"x\"",
                                DOIS_ITENS)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoOutro").value(nullValue()));
    }

    @Test
    void validaDestinoTipoEUnidadesDaInstituicao() throws Exception {
        mvc.perform(post("/api/saidas").header("Authorization", tecnico).contentType(MediaType.APPLICATION_JSON)
                        .content(saida("\"destinoId\": 4, \"destinoExterno\": \"Oficina\"", "\"EVENTO\"", DOIS_ITENS)))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("Informe o destino: uma unidade ou um destino externo"));
        mvc.perform(post("/api/saidas").header("Authorization", tecnico).contentType(MediaType.APPLICATION_JSON)
                        .content(saida("\"destinoExterno\": \"  \"", "\"EVENTO\"", DOIS_ITENS)))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(post("/api/saidas").header("Authorization", tecnico).contentType(MediaType.APPLICATION_JSON)
                        .content(saida(paraUnidade(CETAF_EST), "\"OUTRO\"", DOIS_ITENS)))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("Informe qual é o outro tipo de saída"));
        // CEFEM é só do SESI
        mvc.perform(post("/api/saidas").header("Authorization", tecnico).contentType(MediaType.APPLICATION_JSON)
                        .content(saida(paraUnidade(CEFEM), "\"PERMANENTE\"", DOIS_ITENS)))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("A unidade de destino deve pertencer à instituição SENAI"));
        mvc.perform(post("/api/saidas").header("Authorization", tecnico).contentType(MediaType.APPLICATION_JSON)
                        .content(saida(paraUnidade(CETAF_EST), "\"PERMANENTE\"", "[]")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.itens").value("Informe ao menos um item"));
    }

    @Test
    void permissoesSeguemAsDasTransferencias() throws Exception {
        String corpo = saida(paraUnidade(CETAF_EST), "\"PERMANENTE\"", DOIS_ITENS);
        mvc.perform(post("/api/saidas").header("Authorization", leitor).contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isForbidden());
        long id = criar(tecnico, corpo);

        mvc.perform(get("/api/saidas/{id}", id).header("Authorization", outroTecnico))
                .andExpect(jsonPath("$.podeAlterar").value(false));
        mvc.perform(put("/api/saidas/{id}", id).header("Authorization", outroTecnico)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/saidas/{id}", id).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.criadoPor.nome").value("Usuário tecnico"));
    }

    @Test
    void lixeiraERemocaoDefinitivaComOsItens() throws Exception {
        long id = criar(tecnico, saida(paraUnidade(CETAF_EST), "\"PERMANENTE\"", DOIS_ITENS));
        String contarItens = "SELECT count(*) FROM saida_material_item WHERE saida_id = ?";

        mvc.perform(delete("/api/saidas/{id}/definitivo", id).header("Authorization", tecnico))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(delete("/api/saidas/{id}", id).header("Authorization", tecnico))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/saidas").header("Authorization", leitor))
                .andExpect(jsonPath("$.totalElementos").value(0));
        mvc.perform(get("/api/saidas/{id}", id).header("Authorization", leitor))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/saidas/lixeira").header("Authorization", tecnico))
                .andExpect(jsonPath("$.conteudo[0].id").value(id));
        mvc.perform(get("/api/saidas/lixeira").header("Authorization", outroTecnico))
                .andExpect(jsonPath("$.totalElementos").value(0));
        assertThat(jdbc.queryForObject(contarItens, Long.class, id)).isEqualTo(2);

        mvc.perform(post("/api/saidas/{id}/restaurar", id).header("Authorization", tecnico))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/saidas/{id}", id).header("Authorization", tecnico));
        mvc.perform(delete("/api/saidas/{id}/definitivo", id).header("Authorization", tecnico))
                .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject(contarItens, Long.class, id)).isZero();
    }

    @Test
    void buscaPorMaterialAreaDestinoExternoETipo() throws Exception {
        long interna = criar(tecnico, saida(paraUnidade(CETAF_EST), "\"PERMANENTE\"", DOIS_ITENS));
        long externa = criar(tecnico, saida(paraExterno("Assistência Técnica XYZ"), "\"MANUTENCAO\"",
                "[{\"descricao\": \"Impressora\"}]"));

        mvc.perform(get("/api/saidas").param("busca", "epson").header("Authorization", leitor))
                .andExpect(jsonPath("$.conteudo[*].id", contains((int) interna)));
        mvc.perform(get("/api/saidas").param("busca", "auditório").header("Authorization", leitor))
                .andExpect(jsonPath("$.conteudo[*].id", contains((int) interna)));
        mvc.perform(get("/api/saidas").param("busca", "assistência").header("Authorization", leitor))
                .andExpect(jsonPath("$.conteudo[*].id", contains((int) externa)));
        mvc.perform(get("/api/saidas").param("busca", "manutencao").header("Authorization", leitor))
                .andExpect(jsonPath("$.conteudo[*].id", contains((int) externa)));
        mvc.perform(get("/api/saidas").param("tipo", "PERMANENTE").header("Authorization", leitor))
                .andExpect(jsonPath("$.conteudo[*].id", contains((int) interna)));
        mvc.perform(get("/api/saidas").header("Authorization", leitor))
                .andExpect(jsonPath("$.conteudo[*].id", contains((int) externa, (int) interna)))
                .andExpect(jsonPath("$.conteudo[1].quantidadeItens").value(2));
    }

    @Test
    void unidadeEUsuarioUsadosEmSaidasNaoSaoExcluidos() throws Exception {
        criar(tecnico, saida(paraUnidade(CETAF_EST), "\"PERMANENTE\"", DOIS_ITENS));
        mvc.perform(delete("/api/unidades/{id}", CETAF_EST).header("Authorization", admin))
                .andExpect(status().isConflict());
        long tecnicoId = jdbc.queryForObject("SELECT id FROM usuario WHERE login = 'tecnico'", Long.class);
        mvc.perform(delete("/api/usuarios/{id}", tecnicoId).header("Authorization", admin))
                .andExpect(status().isConflict());
    }

    @Test
    void formularioEmPdfComoOPapelCartaPaisagem() throws Exception {
        long id = criar(tecnico, saida(paraExterno("Assistência Técnica XYZ"), "\"MANUTENCAO\"", DOIS_ITENS));

        byte[] arquivo = mvc.perform(get("/api/saidas/{id}/formulario", id).header("Authorization", leitor))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andReturn().getResponse().getContentAsByteArray();
        try (var pdf = Loader.loadPDF(arquivo)) {
            assertThat(pdf.getNumberOfPages()).isEqualTo(1);
            // Carta paisagem (792 x 612 pt), como o FM-072-UOP-04 original
            var pagina = pdf.getPage(0).getMediaBox();
            assertThat(pagina.getWidth()).isCloseTo(792f, org.assertj.core.data.Offset.offset(1f));
            assertThat(pagina.getHeight()).isCloseTo(612f, org.assertj.core.data.Offset.offset(1f));
            String texto = new PDFTextStripper().getText(pdf);
            assertThat(texto).contains("CONTROLE DE SAÍDA DE MATERIAIS DA UNIDADE", "07/10/2026", "SEDE",
                    "Assistência Técnica XYZ", "Projetor epson", "Laboratório de elétrica", "Auditório",
                    "Retorno previsto em", "João Da Silva", "Assinatura do Portador do Equipamento",
                    "Liberei o material acima discriminado", "Recebi o material acima discriminado",
                    "Responsável da UOP", "FM-072-UOP-04", "Saída nº " + id + " · página 1 de 1");
            // O "X" fica no quadro do tipo escolhido (Manutenção), à esquerda do nome, como no papel
            assertThat(texto).containsPattern("X\\s*MANUTENÇÃO");
            assertThat(texto).contains("ITEM", "ÁREA DE SAÍDA", "OBSERVAÇÃO", "(Caso seja");
            // Na coluna estreita de observação a data vai inteira para a linha seguinte, sem se partir
            assertThat(texto).contains("\n15/10/2026");
            assertThat(texto).doesNotContainPattern("X\\s*PERMANENTE");
            // Nesta modalidade não há patrimônio
            assertThat(texto).doesNotContain("PATRIMÔNIO", "S/P");
        }
    }

    @Test
    void formularioLongoRepeteCabecalhoEmCadaPaginaEAssinaNoFim() throws Exception {
        String itens = IntStream.rangeClosed(1, 40)
                .mapToObj(i -> "{\"descricao\": \"Notebook " + i + "\", \"areaSaida\": \"Sala " + i + "\"}")
                .collect(Collectors.joining(",", "[", "]"));
        long id = criar(tecnico, saida(paraUnidade(CETAF_EST), "\"PERMANENTE\"", itens));

        byte[] arquivo = mvc.perform(get("/api/saidas/{id}/formulario", id).header("Authorization", leitor))
                .andReturn().getResponse().getContentAsByteArray();
        try (var pdf = Loader.loadPDF(arquivo)) {
            int paginas = pdf.getNumberOfPages();
            assertThat(paginas).isGreaterThan(1);
            for (int p = 1; p <= paginas; p++) {
                var leitor = new PDFTextStripper();
                leitor.setStartPage(p);
                leitor.setEndPage(p);
                String texto = leitor.getText(pdf);
                assertThat(texto).contains("CONTROLE DE SAÍDA DE MATERIAIS DA UNIDADE", "PERMANENTE",
                        "FM-072-UOP-04", "Saída nº " + id + " · página " + p + " de " + paginas);
                // As assinaturas vêm logo após o último item, como no papel (aqui, sozinhas na última página)
                if (p < paginas) {
                    assertThat(texto).contains("DESCRIÇÃO DO").doesNotContain("Assinatura do Portador do Equipamento");
                } else {
                    assertThat(texto).contains("Assinatura do Portador do Equipamento", "Responsável da UOP");
                }
            }
            assertThat(new PDFTextStripper().getText(pdf)).contains("1 Notebook 1 Sala 1", "40 Notebook 40 Sala 40");
        }
    }
}
