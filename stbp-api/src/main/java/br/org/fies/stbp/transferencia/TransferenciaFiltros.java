package br.org.fies.stbp.transferencia;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import br.org.fies.stbp.transferencia.TransferenciaDtos.FiltroTransferencia;
import jakarta.persistence.criteria.Predicate;

final class TransferenciaFiltros {

    private TransferenciaFiltros() {
    }

    static Specification<Transferencia> naLixeira(boolean lixeira) {
        return (raiz, consulta, cb) -> lixeira ? cb.isNotNull(raiz.get("excluidoEm")) : cb.isNull(raiz.get("excluidoEm"));
    }

    static Specification<Transferencia> criadaPor(Long usuarioId) {
        return (raiz, consulta, cb) -> cb.equal(raiz.get("criadoPor").get("id"), usuarioId);
    }

    /**
     * Filtros da listagem. Todos se combinam com E; a busca textual é um único bloco OU. No sistema antigo os OU
     * da busca ficavam fora do agrupamento e anulavam os demais filtros.
     */
    static Specification<Transferencia> de(FiltroTransferencia f) {
        return (raiz, consulta, cb) -> {
            List<Predicate> condicoes = new ArrayList<>();
            if (f.instituicaoId() != null) {
                condicoes.add(cb.equal(raiz.get("instituicao").get("id"), f.instituicaoId()));
            }
            if (f.origemId() != null) {
                condicoes.add(cb.equal(raiz.get("origem").get("id"), f.origemId()));
            }
            if (f.destinoId() != null) {
                condicoes.add(cb.equal(raiz.get("destino").get("id"), f.destinoId()));
            }
            if (f.criadoPorId() != null) {
                condicoes.add(cb.equal(raiz.get("criadoPor").get("id"), f.criadoPorId()));
            }
            if (f.motivo() != null) {
                condicoes.add(cb.equal(raiz.get("motivo"), f.motivo()));
            }
            if (f.dataInicial() != null) {
                condicoes.add(cb.greaterThanOrEqualTo(raiz.get("data"), f.dataInicial()));
            }
            if (f.dataFinal() != null) {
                condicoes.add(cb.lessThanOrEqualTo(raiz.get("data"), f.dataFinal()));
            }

            if (f.busca() != null && !f.busca().isBlank()) {
                String busca = f.busca().trim();
                String termo = "%" + busca.toLowerCase() + "%";

                var itens = consulta.subquery(Long.class);
                var item = itens.from(Item.class);
                itens.select(item.get("id")).where(
                        cb.equal(item.get("transferencia"), raiz),
                        cb.or(cb.like(cb.lower(item.get("descricao")), termo),
                                cb.like(cb.lower(item.get("patrimonio")), termo),
                                cb.like(cb.lower(item.get("observacao")), termo)));

                List<Predicate> alternativas = new ArrayList<>(List.of(
                        cb.like(cb.lower(raiz.get("origem").get("nome")), termo),
                        cb.like(cb.lower(raiz.get("destino").get("nome")), termo),
                        cb.like(cb.lower(raiz.get("instituicao").get("nome")), termo),
                        cb.like(cb.lower(raiz.get("criadoPor").get("nome")), termo),
                        cb.like(cb.lower(raiz.get("responsavelEnvio")), termo),
                        cb.like(cb.lower(raiz.get("responsavelRecebimento")), termo),
                        cb.exists(itens)));

                var motivos = Motivo.comDescricaoContendo(busca);
                if (!motivos.isEmpty()) {
                    alternativas.add(raiz.get("motivo").in(motivos));
                }
                if (busca.matches("\\d{1,18}")) {
                    alternativas.add(cb.equal(raiz.get("id"), Long.valueOf(busca)));
                }
                condicoes.add(cb.or(alternativas.toArray(Predicate[]::new)));
            }
            return cb.and(condicoes.toArray(Predicate[]::new));
        };
    }
}
