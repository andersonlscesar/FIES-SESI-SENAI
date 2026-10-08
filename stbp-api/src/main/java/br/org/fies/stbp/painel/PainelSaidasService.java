package br.org.fies.stbp.painel;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.fies.stbp.painel.PainelDtos.Periodo;
import br.org.fies.stbp.painel.PainelSaidasDtos.Contagem;
import br.org.fies.stbp.painel.PainelSaidasDtos.Destino;
import br.org.fies.stbp.painel.PainelSaidasDtos.Material;
import br.org.fies.stbp.painel.PainelSaidasDtos.Mes;
import br.org.fies.stbp.painel.PainelSaidasDtos.PainelSaidas;
import br.org.fies.stbp.painel.PainelSaidasDtos.PorTipo;
import br.org.fies.stbp.painel.PainelSaidasDtos.Resumo;
import br.org.fies.stbp.painel.PainelSaidasDtos.Rota;
import br.org.fies.stbp.saida.TipoSaida;

/**
 * Agregados do painel de saídas de materiais, calculados no banco. Mesmas regras do painel de transferências: só
 * saídas fora da lixeira, dentro do período (pela data da saída) e, opcionalmente, de uma instituição.
 */
@Service
public class PainelSaidasService {

    private static final int LIMITE_RANKING = 8;
    private static final int LIMITE_TABELAS = 10;

    /** Filtro comum a todas as consultas ({@code s} = saida_material). */
    private static final String FILTRO = """
            s.excluido_em IS NULL
            AND s.data BETWEEN :inicio AND :fim
            AND (CAST(:instituicaoId AS BIGINT) IS NULL OR s.instituicao_id = :instituicaoId)
            """;

    /** Texto do destino externo normalizado (minúsculas, espaços simples): agrupa grafias diferentes do mesmo lugar. */
    private static final String EXTERNO_NORMALIZADO = "lower(regexp_replace(trim(s.destino_externo), '\\s+', ' ', 'g'))";

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock relogio;

    PainelSaidasService(NamedParameterJdbcTemplate jdbc, Clock relogio) {
        this.jdbc = jdbc;
        this.relogio = relogio;
    }

    /** Sem datas: os últimos 12 meses (do 1º dia de 11 meses atrás até hoje). Ver {@link Periodos}. */
    @Transactional(readOnly = true)
    public PainelSaidas gerar(LocalDate dataInicial, LocalDate dataFinal, Long instituicaoId) {
        Periodo[] periodos = Periodos.calcular(dataInicial, dataFinal, LocalDate.now(relogio));
        var periodo = periodos[0];
        var atual = Periodos.parametros(periodo, instituicaoId);
        return new PainelSaidas(periodo, periodos[1],
                resumo(atual, Periodos.parametros(periodos[1], instituicaoId)),
                porMes(atual, periodo),
                porTipo(atual),
                contagem(atual, "s.instituicao_id", "instituicao", Integer.MAX_VALUE),
                contagem(atual, "s.origem_id", "unidade", LIMITE_RANKING),
                destinos(atual),
                rotas(atual),
                contagem(atual, "s.criado_por_id", "usuario", LIMITE_RANKING),
                materiais(atual));
    }

    private Resumo resumo(MapSqlParameterSource atual, MapSqlParameterSource anterior) {
        // count(u.id) ignora o destino nulo das saídas para destino externo
        String sql = """
                SELECT count(DISTINCT s.id) AS saidas,
                       count(i.id) AS itens,
                       count(DISTINCT s.id) FILTER (WHERE s.destino_id IS NULL) AS externo,
                       (SELECT count(u.id) FROM (
                            SELECT s2.origem_id AS id FROM saida_material s2 WHERE %1$s
                            UNION SELECT s2.destino_id FROM saida_material s2 WHERE %1$s) u) AS unidades
                  FROM saida_material s
                  LEFT JOIN saida_material_item i ON i.saida_id = s.id
                 WHERE %2$s
                """.formatted(FILTRO.replace("s.", "s2."), FILTRO);
        long[] a = jdbc.queryForObject(sql, atual, (rs, n) -> new long[] {
                rs.getLong("saidas"), rs.getLong("itens"), rs.getLong("externo"), rs.getLong("unidades")});
        long[] b = jdbc.queryForObject(sql, anterior, (rs, n) -> new long[] {rs.getLong("saidas"), rs.getLong("itens")});
        return new Resumo(a[0], a[1], a[2], a[3], b[0], b[1]);
    }

    /** Uma linha por mês do período, inclusive os meses sem saídas (zero). */
    private List<Mes> porMes(MapSqlParameterSource p, Periodo periodo) {
        String sql = """
                SELECT to_char(s.data, 'YYYY-MM') AS mes, count(DISTINCT s.id) AS saidas, count(i.id) AS itens
                  FROM saida_material s
                  LEFT JOIN saida_material_item i ON i.saida_id = s.id
                 WHERE %s
                 GROUP BY 1
                """.formatted(FILTRO);
        Map<String, long[]> valores = new HashMap<>();
        jdbc.query(sql, p, rs -> {
            valores.put(rs.getString("mes"), new long[] {rs.getLong("saidas"), rs.getLong("itens")});
        });
        return Periodos.meses(periodo, valores.keySet()).stream().map(mes -> {
            long[] v = valores.getOrDefault(mes.toString(), new long[] {0, 0});
            return new Mes(mes.toString(), v[0], v[1]);
        }).toList();
    }

    /** Os cinco tipos sempre aparecem (com zero), na ordem do formulário. */
    private List<PorTipo> porTipo(MapSqlParameterSource p) {
        String sql = """
                SELECT s.tipo, count(DISTINCT s.id) AS saidas, count(i.id) AS itens
                  FROM saida_material s
                  LEFT JOIN saida_material_item i ON i.saida_id = s.id
                 WHERE %s
                 GROUP BY s.tipo
                """.formatted(FILTRO);
        Map<String, long[]> valores = new HashMap<>();
        jdbc.query(sql, p, rs -> {
            valores.put(rs.getString("tipo"), new long[] {rs.getLong("saidas"), rs.getLong("itens")});
        });
        return Arrays.stream(TipoSaida.values()).map(t -> {
            long[] v = valores.getOrDefault(t.name(), new long[] {0, 0});
            return new PorTipo(t, t.getDescricao(), v[0], v[1]);
        }).toList();
    }

    /** Contagem agrupada por uma coluna de {@code saida_material} que aponta para {@code tabela} (id, nome). */
    private List<Contagem> contagem(MapSqlParameterSource p, String coluna, String tabela, int limite) {
        String sql = """
                SELECT x.id, x.nome, count(DISTINCT s.id) AS saidas, count(i.id) AS itens
                  FROM saida_material s
                  JOIN %2$s x ON x.id = %1$s
                  LEFT JOIN saida_material_item i ON i.saida_id = s.id
                 WHERE %3$s
                 GROUP BY x.id, x.nome
                 ORDER BY saidas DESC, itens DESC, x.nome
                 LIMIT %4$d
                """.formatted(coluna, tabela, FILTRO, limite);
        return jdbc.query(sql, p, (rs, n) -> new Contagem(rs.getLong("id"), rs.getString("nome"),
                rs.getLong("saidas"), rs.getLong("itens")));
    }

    /** Unidades de destino e destinos externos no mesmo ranking; o externo exibe a grafia mais frequente. */
    private List<Destino> destinos(MapSqlParameterSource p) {
        String sql = """
                SELECT coalesce(min(d.nome), mode() WITHIN GROUP (ORDER BY s.destino_externo)) AS nome,
                       s.destino_id IS NULL AS externo,
                       count(DISTINCT s.id) AS saidas, count(i.id) AS itens
                  FROM saida_material s
                  LEFT JOIN unidade d ON d.id = s.destino_id
                  LEFT JOIN saida_material_item i ON i.saida_id = s.id
                 WHERE %s
                 GROUP BY s.destino_id, %s
                 ORDER BY saidas DESC, itens DESC, 1
                 LIMIT %d
                """.formatted(FILTRO, EXTERNO_NORMALIZADO, LIMITE_RANKING);
        return jdbc.query(sql, p, (rs, n) -> new Destino(rs.getString("nome"), rs.getBoolean("externo"),
                rs.getLong("saidas"), rs.getLong("itens")));
    }

    private List<Rota> rotas(MapSqlParameterSource p) {
        String sql = """
                SELECT o.nome AS origem,
                       coalesce(min(d.nome), mode() WITHIN GROUP (ORDER BY s.destino_externo)) AS destino,
                       s.destino_id IS NULL AS externo,
                       count(DISTINCT s.id) AS saidas, count(i.id) AS itens
                  FROM saida_material s
                  JOIN unidade o ON o.id = s.origem_id
                  LEFT JOIN unidade d ON d.id = s.destino_id
                  LEFT JOIN saida_material_item i ON i.saida_id = s.id
                 WHERE %s
                 GROUP BY o.nome, s.destino_id, %s
                 ORDER BY saidas DESC, itens DESC, 1, 2
                 LIMIT %d
                """.formatted(FILTRO, EXTERNO_NORMALIZADO, LIMITE_TABELAS);
        return jdbc.query(sql, p, (rs, n) -> new Rota(rs.getString("origem"), rs.getString("destino"),
                rs.getBoolean("externo"), rs.getLong("saidas"), rs.getLong("itens")));
    }

    /** Materiais agrupados pela descrição normalizada (minúsculas, espaços simples); exibe a grafia mais frequente. */
    private List<Material> materiais(MapSqlParameterSource p) {
        String sql = """
                SELECT mode() WITHIN GROUP (ORDER BY i.descricao) AS descricao,
                       count(*) AS itens,
                       count(DISTINCT s.id) AS saidas
                  FROM saida_material_item i
                  JOIN saida_material s ON s.id = i.saida_id
                 WHERE %s
                 GROUP BY lower(regexp_replace(trim(i.descricao), '\\s+', ' ', 'g'))
                 ORDER BY itens DESC, saidas DESC, 1
                 LIMIT %d
                """.formatted(FILTRO, LIMITE_TABELAS);
        return jdbc.query(sql, p, (rs, n) -> new Material(rs.getString("descricao"), rs.getLong("itens"),
                rs.getLong("saidas")));
    }
}
