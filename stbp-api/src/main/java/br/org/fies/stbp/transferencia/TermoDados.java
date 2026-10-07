package br.org.fies.stbp.transferencia;

import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;

import br.org.fies.stbp.cadastro.Imagem;

/** Dados já formatados para o template do termo (resources/pdf/termo.xhtml). */
public record TermoDados(long numero, String data, Motivo motivo, String instituicao, String logo, String origem,
        String destino, String responsavelEnvio, String responsavelRecebimento, List<ItemTermo> itens) {

    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public record ItemTermo(int ordem, String descricao, String patrimonio, String observacao) {
    }

    static TermoDados de(Transferencia t, Imagem logo) {
        var itens = t.getItens().stream()
                .map(i -> new ItemTermo(i.getOrdem(), i.getDescricao(),
                        i.getPatrimonio() == null ? "S/P" : i.getPatrimonio(),
                        i.getObservacao() == null ? "" : i.getObservacao()))
                .toList();
        String logoDataUri = logo == null ? null
                : "data:" + logo.tipo() + ";base64," + Base64.getEncoder().encodeToString(logo.dados());
        return new TermoDados(t.getId(), t.getData().format(DATA), t.getMotivo(), t.getInstituicao().getNome(),
                logoDataUri, t.getOrigem().getNome(), t.getDestino().getNome(), t.getResponsavelEnvio(),
                t.getResponsavelRecebimento(), itens);
    }

    /** "( X )" no quadro do motivo da transferência; "(    )" nos demais. */
    public String marca(String motivo) {
        return this.motivo.name().equals(motivo) ? "(  X  )" : "(       )";
    }

    public String titulo() {
        return "Termo " + numero + " - " + origem + " - " + destino;
    }
}
