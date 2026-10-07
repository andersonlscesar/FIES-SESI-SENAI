package br.org.fies.stbp.painel;

import java.sql.Date;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.fies.stbp.comum.RegraNegocioException;
import br.org.fies.stbp.painel.PainelDtos.Bem;
import br.org.fies.stbp.painel.PainelDtos.Contagem;
import br.org.fies.stbp.painel.PainelDtos.Mes;
import br.org.fies.stbp.painel.PainelDtos.Painel;
import br.org.fies.stbp.painel.PainelDtos.Periodo;
import br.org.fies.stbp.painel.PainelDtos.PorMotivo;
import br.org.fies.stbp.painel.PainelDtos.Resumo;
import br.org.fies.stbp.painel.PainelDtos.Rota;
import br.org.fies.stbp.transferencia.Motivo;

/**
 * Agregados do painel de análise, calculados no banco. Considera só transferências fora da lixeira, dentro do
 * período (pela data da transferência) e, opcionalmente, de uma instituição.
 */
@Service
public class PainelService {

    private static final int LIMITE_RANKING = 8;
    private static final int LIMITE_TABELAS = 10;

    /** Filtro comum a todas as consultas ({@code t} = transferencia). */
    private static final String FILTRO = """
            t.excluido_em IS NULL
            AND t.data BETWEEN :inicio AND :fim
            AND (CAST(:instituicaoId AS BIGINT) IS NULL OR t.instituicao_id = :instituicaoId)
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock relogio;

    PainelService(NamedParameterJdbcTemplate jdbc, Clock relogio) {
        this.jdbc = jdbc;
        this.relogio = relogio;
    }

    /** Sem datas: os últimos 12 meses completos até hoje (do 1º dia de 11 meses atrás até hoje). */
    @Transactional(readOnly = true)
    public Painel gerar(LocalDate dataInicial, LocalDate dataFinal, Long instituicaoId) {
        LocalDate hoje = LocalDate.now(relogio);
        LocalDate fim = dataFinal != null ? dataFinal : hoje;
        LocalDate inicio = dataInicial != null ? dataInicial : fim.minusMonths(11).withDayOfMonth(1);
        if (inicio.isAfter(fim)) {
            throw new RegraNegocioException("A data inicial deve ser anterior à data final");
        }
        long dias = ChronoUnit.DAYS.between(inicio, fim) + 1;
        var periodo = new Periodo(inicio, fim);
        var anterior = new Periodo(inicio.minusDays(dias), inicio.minusDays(1));

        var atual = parametros(periodo, instituicaoId);
        return new Painel(periodo, anterior,
                resumo(atual, parametros(anterior, instituicaoId)),
                porMes(atual, periodo),
                porMotivo(atual),
                contagem(atual, "t.instituicao_id", "instituicao", Integer.MAX_VALUE),
                contagem(atual, "t.origem_id", "unidade", LIMITE_RANKING),
                contagem(atual, "t.destino_id", "unidade", LIMITE_RANKING),
                rotas(atual),
                emissores(atual),
                bens(atual));
    }

    private static MapSqlParameterSource parametros(Periodo p, Long instituicaoId) {
        return new MapSqlParameterSource()
                .addValue("inicio", Date.valueOf(p.inicio()))
                .addValue("fim", Date.valueOf(p.fim()))
                .addValue("instituicaoId", instituicaoId);
    }

    private Resumo resumo(MapSqlParameterSource atual, MapSqlParameterSource anterior) {
        String sql = """
                SELECT count(DISTINCT t.id) AS transferencias,
                       count(i.id) AS itens,
                       count(i.id) FILTER (WHERE i.patrimonio IS NULL) AS sem_patrimonio,
                       (SELECT count(*) FROM (
                            SELECT t2.origem_id FROM transferencia t2 WHERE %1$s
                            UNION SELECT t2.destino_id FROM transferencia t2 WHERE %1$s) u) AS unidades
                  FROM transferencia t
                  LEFT JOIN item i ON i.transferencia_id = t.id
                 WHERE %2$s
                """.formatted(FILTRO.replace("t.", "t2."), FILTRO);
        long[] a = jdbc.queryForObject(sql, atual, (rs, n) -> new long[] {
                rs.getLong("transferencias"), rs.getLong("itens"), rs.getLong("sem_patrimonio"), rs.getLong("unidades")});
        long[] b = jdbc.queryForObject(sql, anterior, (rs, n) -> new long[] {rs.getLong("transferencias"), rs.getLong("itens")});
        return new Resumo(a[0], a[1], a[2], a[3], b[0], b[1]);
    }

    /** Uma linha por mês do período, inclusive os meses sem transferências (zero). */
    private List<Mes> porMes(MapSqlParameterSource p, Periodo periodo) {
        String sql = """
                SELECT to_char(t.data, 'YYYY-MM') AS mes,
                       count(DISTINCT t.id) AS transferencias,
                       count(i.id) AS itens
                  FROM transferencia t
                  LEFT JOIN item i ON i.transferencia_id = t.id
                 WHERE %s
                 GROUP BY 1
                """.formatted(FILTRO);
        Map<String, long[]> valores = new HashMap<>();
        jdbc.query(sql, p, rs -> {
            valores.put(rs.getString("mes"), new long[] {rs.getLong("transferencias"), rs.getLong("itens")});
        });

        // Para "todo o histórico", começa no primeiro mês com dados, e não na data inicial (ex.: 2000-01)
        YearMonth primeiro = valores.keySet().stream().map(YearMonth::parse).min(YearMonth::compareTo)
                .orElse(YearMonth.from(periodo.inicio()));
        YearMonth mes = YearMonth.from(periodo.inicio());
        if (primeiro.isAfter(mes) && ChronoUnit.MONTHS.between(mes, YearMonth.from(periodo.fim())) > 24) {
            mes = primeiro;
        }
        var lista = new ArrayList<Mes>();
        for (; !mes.isAfter(YearMonth.from(periodo.fim())); mes = mes.plusMonths(1)) {
            long[] v = valores.getOrDefault(mes.toString(), new long[] {0, 0});
            lista.add(new Mes(mes.toString(), v[0], v[1]));
        }
        return lista;
    }

    /** Os quatro motivos sempre aparecem (com zero), na ordem do enum. */
    private List<PorMotivo> porMotivo(MapSqlParameterSource p) {
        String sql = """
                SELECT t.motivo, count(DISTINCT t.id) AS transferencias, count(i.id) AS itens
                  FROM transferencia t
                  LEFT JOIN item i ON i.transferencia_id = t.id
                 WHERE %s
                 GROUP BY t.motivo
                """.formatted(FILTRO);
        Map<String, long[]> valores = new HashMap<>();
        jdbc.query(sql, p, rs -> {
            valores.put(rs.getString("motivo"), new long[] {rs.getLong("transferencias"), rs.getLong("itens")});
        });
        return Arrays.stream(Motivo.values()).map(m -> {
            long[] v = valores.getOrDefault(m.name(), new long[] {0, 0});
            return new PorMotivo(m, m.getDescricao(), v[0], v[1]);
        }).toList();
    }

    /** Contagem agrupada por uma coluna de {@code transferencia} que aponta para {@code tabela} (id, nome). */
    private List<Contagem> contagem(MapSqlParameterSource p, String coluna, String tabela, int limite) {
        String sql = """
                SELECT x.id, x.nome, count(DISTINCT t.id) AS transferencias, count(i.id) AS itens
                  FROM transferencia t
                  JOIN %2$s x ON x.id = %1$s
                  LEFT JOIN item i ON i.transferencia_id = t.id
                 WHERE %3$s
                 GROUP BY x.id, x.nome
                 ORDER BY transferencias DESC, itens DESC, x.nome
                 LIMIT %4$d
                """.formatted(coluna, tabela, FILTRO, limite);
        return jdbc.query(sql, p, (rs, n) -> new Contagem(rs.getLong("id"), rs.getString("nome"),
                rs.getLong("transferencias"), rs.getLong("itens")));
    }

    private List<Rota> rotas(MapSqlParameterSource p) {
        String sql = """
                SELECT o.nome AS origem, d.nome AS destino, count(DISTINCT t.id) AS transferencias, count(i.id) AS itens
                  FROM transferencia t
                  JOIN unidade o ON o.id = t.origem_id
                  JOIN unidade d ON d.id = t.destino_id
                  LEFT JOIN item i ON i.transferencia_id = t.id
                 WHERE %s
                 GROUP BY o.nome, d.nome
                 ORDER BY transferencias DESC, itens DESC, o.nome, d.nome
                 LIMIT %d
                """.formatted(FILTRO, LIMITE_TABELAS);
        return jdbc.query(sql, p, (rs, n) -> new Rota(rs.getString("origem"), rs.getString("destino"),
                rs.getLong("transferencias"), rs.getLong("itens")));
    }

    private List<Contagem> emissores(MapSqlParameterSource p) {
        String sql = """
                SELECT u.id, u.nome, count(DISTINCT t.id) AS transferencias, count(i.id) AS itens
                  FROM transferencia t
                  JOIN usuario u ON u.id = t.criado_por_id
                  LEFT JOIN item i ON i.transferencia_id = t.id
                 WHERE %s
                 GROUP BY u.id, u.nome
                 ORDER BY transferencias DESC, itens DESC, u.nome
                 LIMIT %d
                """.formatted(FILTRO, LIMITE_RANKING);
        return jdbc.query(sql, p, (rs, n) -> new Contagem(rs.getLong("id"), rs.getString("nome"),
                rs.getLong("transferencias"), rs.getLong("itens")));
    }

    /** Bens agrupados pela descrição normalizada (minúsculas, espaços simples); exibe a grafia mais frequente. */
    private List<Bem> bens(MapSqlParameterSource p) {
        String sql = """
                SELECT mode() WITHIN GROUP (ORDER BY i.descricao) AS descricao,
                       count(*) AS itens,
                       count(DISTINCT t.id) AS transferencias
                  FROM item i
                  JOIN transferencia t ON t.id = i.transferencia_id
                 WHERE %s
                 GROUP BY lower(regexp_replace(trim(i.descricao), '\\s+', ' ', 'g'))
                 ORDER BY itens DESC, transferencias DESC, 1
                 LIMIT %d
                """.formatted(FILTRO, LIMITE_TABELAS);
        return jdbc.query(sql, p, (rs, n) -> new Bem(rs.getString("descricao"), rs.getLong("itens"),
                rs.getLong("transferencias")));
    }
}
