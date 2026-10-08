package br.org.fies.stbp.saida;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import br.org.fies.stbp.saida.SaidaDtos.FiltroSaida;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

final class SaidaFiltros {

    private SaidaFiltros() {
    }

    static Specification<SaidaMaterial> naLixeira(boolean lixeira) {
        return (raiz, consulta, cb) -> lixeira ? cb.isNotNull(raiz.get("excluidoEm")) : cb.isNull(raiz.get("excluidoEm"));
    }

    static Specification<SaidaMaterial> criadaPor(Long usuarioId) {
        return (raiz, consulta, cb) -> cb.equal(raiz.get("criadoPor").get("id"), usuarioId);
    }

    /** Filtros da listagem, combinados com E; a busca textual é um único bloco OU (como nas transferências). */
    static Specification<SaidaMaterial> de(FiltroSaida f) {
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
            if (f.tipo() != null) {
                condicoes.add(cb.equal(raiz.get("tipo"), f.tipo()));
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
                var item = itens.from(ItemSaida.class);
                itens.select(item.get("id")).where(
                        cb.equal(item.get("saida"), raiz),
                        cb.or(cb.like(cb.lower(item.get("descricao")), termo),
                                cb.like(cb.lower(item.get("areaSaida")), termo),
                                cb.like(cb.lower(item.get("areaEntrada")), termo),
                                cb.like(cb.lower(item.get("observacao")), termo)));

                // Destino é opcional (pode ser externo): junção à esquerda para não perder essas saídas
                var destino = raiz.join("destino", JoinType.LEFT);
                List<Predicate> alternativas = new ArrayList<>(List.of(
                        cb.like(cb.lower(raiz.get("origem").get("nome")), termo),
                        cb.like(cb.lower(destino.get("nome")), termo),
                        cb.like(cb.lower(raiz.get("destinoExterno")), termo),
                        cb.like(cb.lower(raiz.get("instituicao").get("nome")), termo),
                        cb.like(cb.lower(raiz.get("criadoPor").get("nome")), termo),
                        cb.like(cb.lower(raiz.get("portador")), termo),
                        cb.like(cb.lower(raiz.get("tipoOutro")), termo),
                        cb.exists(itens)));

                var tipos = TipoSaida.comDescricaoContendo(busca);
                if (!tipos.isEmpty()) {
                    alternativas.add(raiz.get("tipo").in(tipos));
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
