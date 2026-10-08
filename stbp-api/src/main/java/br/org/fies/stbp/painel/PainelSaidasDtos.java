package br.org.fies.stbp.painel;

import java.util.List;

import br.org.fies.stbp.painel.PainelDtos.Periodo;
import br.org.fies.stbp.saida.TipoSaida;

/** Respostas do painel de saídas de materiais (GET /api/painel/saidas). */
public final class PainelSaidasDtos {

    private PainelSaidasDtos() {
    }

    /** Totais do período e do período anterior de mesma duração (para a variação). */
    public record Resumo(long saidas, long itens, long paraDestinoExterno, long unidadesEnvolvidas, long saidasAnterior,
            long itensAnterior) {
    }

    /** {@code mes} no formato AAAA-MM; meses sem saídas vêm com zero. */
    public record Mes(String mes, long saidas, long itens) {
    }

    public record PorTipo(TipoSaida tipo, String descricao, long saidas, long itens) {
    }

    /** Contagem por cadastro (instituição, unidade, usuário). */
    public record Contagem(Long id, String nome, long saidas, long itens) {
    }

    /** Destino: uma unidade ou um destino externo ({@code externo = true}, agrupado pelo texto). */
    public record Destino(String nome, boolean externo, long saidas, long itens) {
    }

    public record Rota(String origem, String destino, boolean destinoExterno, long saidas, long itens) {
    }

    /** Descrição mais frequente do material (agrupada sem diferenciar maiúsculas e espaços) e quantos itens. */
    public record Material(String descricao, long itens, long saidas) {
    }

    public record PainelSaidas(Periodo periodo, Periodo periodoAnterior, Resumo resumo, List<Mes> porMes,
            List<PorTipo> porTipo, List<Contagem> porInstituicao, List<Contagem> principaisOrigens,
            List<Destino> principaisDestinos, List<Rota> principaisRotas, List<Contagem> principaisEmissores,
            List<Material> materiaisMaisFrequentes) {
    }
}
