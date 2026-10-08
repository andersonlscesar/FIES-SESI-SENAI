package br.org.fies.stbp.saida;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.IntStream;

import br.org.fies.stbp.cadastro.Imagem;

/** Dados já formatados para o template do formulário (resources/pdf/controle-saida.xhtml). */
public record ControleSaidaDados(long numero, String data, TipoSaida tipo, String tipoOutro, String instituicao,
        String logo, String origem, String destino, String portador, List<ItemFormulario> itens) {

    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** O formulário em papel tem 4 linhas de itens; com menos itens, completa com linhas em branco. */
    private static final int LINHAS_MINIMAS = 4;

    public record ItemFormulario(int ordem, String descricao, String areaSaida, String areaEntrada, String observacao) {

        /**
         * A observação em trechos, com as datas separadas: o template as imprime sem quebra de linha, para que a
         * "data prevista de retorno" não se parta em "15 /10/2026" na coluna estreita.
         */
        public List<Trecho> observacaoEmTrechos() {
            var trechos = new ArrayList<Trecho>();
            Matcher m = DATA_NO_TEXTO.matcher(observacao);
            int inicio = 0;
            while (m.find()) {
                if (m.start() > inicio) {
                    trechos.add(new Trecho(observacao.substring(inicio, m.start()), false));
                }
                trechos.add(new Trecho(m.group(), true));
                inicio = m.end();
            }
            if (inicio < observacao.length()) {
                trechos.add(new Trecho(observacao.substring(inicio), false));
            }
            return trechos;
        }
    }

    public record Trecho(String texto, boolean data) {
    }

    private static final Pattern DATA_NO_TEXTO = Pattern.compile("\\d{1,2}/\\d{1,2}(/\\d{2,4})?");

    static ControleSaidaDados de(SaidaMaterial s, Imagem logo) {
        var itens = s.getItens().stream()
                .map(i -> new ItemFormulario(i.getOrdem(), i.getDescricao(), vazio(i.getAreaSaida()),
                        vazio(i.getAreaEntrada()), vazio(i.getObservacao())))
                .toList();
        String logoDataUri = logo == null ? null
                : "data:" + logo.tipo() + ";base64," + Base64.getEncoder().encodeToString(logo.dados());
        return new ControleSaidaDados(s.getId(), s.getData().format(DATA), s.getTipo(), vazio(s.getTipoOutro()),
                s.getInstituicao().getNome(), logoDataUri, s.getOrigem().getNome(), s.getNomeDestino(),
                vazio(s.getPortador()), itens);
    }

    private static String vazio(String texto) {
        return texto == null ? "" : texto;
    }

    /** "X" dentro do quadro do tipo escolhido; vazio nos demais. */
    public String marca(String tipo) {
        return this.tipo.name().equals(tipo) ? "X" : "";
    }

    /** Linhas em branco que completam a tabela até {@link #LINHAS_MINIMAS}. */
    public List<Integer> linhasEmBranco() {
        return IntStream.range(itens.size(), LINHAS_MINIMAS).boxed().toList();
    }

    public String titulo() {
        return "Saida " + numero + " - " + origem + " - " + destino;
    }
}
