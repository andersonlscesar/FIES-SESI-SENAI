package br.org.fies.stbp.painel;

import java.sql.Date;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;

import br.org.fies.stbp.comum.RegraNegocioException;
import br.org.fies.stbp.painel.PainelDtos.Periodo;

/** Regras de período comuns aos painéis de transferências e de saídas de materiais. */
final class Periodos {

    private Periodos() {
    }

    /** Período analisado e o anterior de mesma duração. Sem datas: do 1º dia de 11 meses atrás até hoje. */
    static Periodo[] calcular(LocalDate dataInicial, LocalDate dataFinal, LocalDate hoje) {
        LocalDate fim = dataFinal != null ? dataFinal : hoje;
        LocalDate inicio = dataInicial != null ? dataInicial : fim.minusMonths(11).withDayOfMonth(1);
        if (inicio.isAfter(fim)) {
            throw new RegraNegocioException("A data inicial deve ser anterior à data final");
        }
        long dias = ChronoUnit.DAYS.between(inicio, fim) + 1;
        return new Periodo[] {new Periodo(inicio, fim), new Periodo(inicio.minusDays(dias), inicio.minusDays(1))};
    }

    static MapSqlParameterSource parametros(Periodo p, Long instituicaoId) {
        return new MapSqlParameterSource()
                .addValue("inicio", Date.valueOf(p.inicio()))
                .addValue("fim", Date.valueOf(p.fim()))
                .addValue("instituicaoId", instituicaoId);
    }

    /**
     * Todos os meses do período, inclusive os sem movimento. Para "todo o histórico" (mais de 24 meses), começa no
     * primeiro mês com dados, e não na data inicial (ex.: 2000-01).
     */
    static List<YearMonth> meses(Periodo periodo, Collection<String> mesesComDados) {
        YearMonth ultimo = YearMonth.from(periodo.fim());
        YearMonth mes = YearMonth.from(periodo.inicio());
        YearMonth primeiro = mesesComDados.stream().map(YearMonth::parse).min(YearMonth::compareTo).orElse(mes);
        if (primeiro.isAfter(mes) && ChronoUnit.MONTHS.between(mes, ultimo) > 24) {
            mes = primeiro;
        }
        var lista = new ArrayList<YearMonth>();
        for (; !mes.isAfter(ultimo); mes = mes.plusMonths(1)) {
            lista.add(mes);
        }
        return lista;
    }
}
