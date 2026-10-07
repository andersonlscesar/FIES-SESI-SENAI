package br.org.fies.stbp.transferencia;

import java.util.Arrays;
import java.util.List;

/** Motivo da transferência. O tipo define em qual quadro do termo o "X" é marcado. */
public enum Motivo {
    TRANSFERENCIA_ENTRE_FILIAIS("Transferência entre filiais", Tipo.DEFINITIVA),
    BAIXA_DESCARTE("Baixa / Descarte", Tipo.DEFINITIVA),
    MANUTENCAO("Manutenção", Tipo.TEMPORARIA),
    EMPRESTIMO_TEMPORARIO("Empréstimo temporário", Tipo.TEMPORARIA);

    public enum Tipo {
        DEFINITIVA,
        TEMPORARIA
    }

    private final String descricao;
    private final Tipo tipo;

    Motivo(String descricao, Tipo tipo) {
        this.descricao = descricao;
        this.tipo = tipo;
    }

    public String getDescricao() {
        return descricao;
    }

    public Tipo getTipo() {
        return tipo;
    }

    /** Motivos cuja descrição contém o termo (usado na busca textual). */
    static List<Motivo> comDescricaoContendo(String termo) {
        String t = termo.toLowerCase();
        return Arrays.stream(values()).filter(m -> m.descricao.toLowerCase().contains(t)).toList();
    }
}
