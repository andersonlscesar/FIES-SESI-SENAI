package br.org.fies.stbp.saida;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/** Quadros do formulário FM-072-UOP-04. {@code OUTRO} exige a descrição ("Outro, qual: ..."). */
public enum TipoSaida {
    PERMANENTE("Permanente"),
    TEMPORARIO("Temporário"),
    MANUTENCAO("Manutenção"),
    EVENTO("Evento"),
    OUTRO("Outro");

    private final String descricao;

    TipoSaida(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }

    /** Tipos cujo nome contém o texto (sem acentos/maiúsculas): para a busca textual da listagem. */
    static List<TipoSaida> comDescricaoContendo(String texto) {
        String procurado = normalizar(texto);
        return Arrays.stream(values()).filter(t -> normalizar(t.descricao).contains(procurado)).toList();
    }

    private static String normalizar(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }
}
