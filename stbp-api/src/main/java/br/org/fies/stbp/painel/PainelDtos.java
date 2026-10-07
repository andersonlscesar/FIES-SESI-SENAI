package br.org.fies.stbp.painel;

import java.time.LocalDate;
import java.util.List;

import br.org.fies.stbp.transferencia.Motivo;

/** Respostas do painel de análise (GET /api/painel). */
public final class PainelDtos {

    private PainelDtos() {
    }

    public record Periodo(LocalDate inicio, LocalDate fim) {
    }

    /** Totais do período e do período anterior de mesma duração (para a variação). */
    public record Resumo(long transferencias, long itens, long itensSemPatrimonio, long unidadesEnvolvidas,
            long transferenciasAnterior, long itensAnterior) {
    }

    /** {@code mes} no formato AAAA-MM; meses sem transferências vêm com zero. */
    public record Mes(String mes, long transferencias, long itens) {
    }

    public record PorMotivo(Motivo motivo, String descricao, long transferencias, long itens) {
    }

    /** Contagem por cadastro (instituição, unidade, usuário). */
    public record Contagem(Long id, String nome, long transferencias, long itens) {
    }

    public record Rota(String origem, String destino, long transferencias, long itens) {
    }

    /** Descrição mais frequente do bem (agrupada sem diferenciar maiúsculas e espaços) e quantos itens. */
    public record Bem(String descricao, long itens, long transferencias) {
    }

    public record Painel(Periodo periodo, Periodo periodoAnterior, Resumo resumo, List<Mes> porMes,
            List<PorMotivo> porMotivo, List<Contagem> porInstituicao, List<Contagem> principaisOrigens,
            List<Contagem> principaisDestinos, List<Rota> principaisRotas, List<Contagem> principaisEmissores,
            List<Bem> bensMaisTransferidos) {
    }
}
