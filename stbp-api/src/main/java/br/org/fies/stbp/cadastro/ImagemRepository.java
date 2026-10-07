package br.org.fies.stbp.cadastro;

import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Acesso direto às colunas de imagem, para que os bytes só sejam lidos quando realmente usados
 * (as entidades JPA não mapeiam essas colunas).
 */
@Repository
public class ImagemRepository {

    /** Onde cada tipo de imagem fica guardado. Tabelas e colunas fixas: nunca vêm de entrada do usuário. */
    public enum Alvo {
        LOGO_INSTITUICAO("instituicao", "logo"),
        FOTO_UNIDADE("unidade", "imagem");

        private final String tabela;
        private final String coluna;

        Alvo(String tabela, String coluna) {
            this.tabela = tabela;
            this.coluna = coluna;
        }
    }

    private final JdbcTemplate jdbc;

    ImagemRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Imagem> buscar(Alvo alvo, Long id) {
        String sql = "SELECT %1$s, %1$s_tipo FROM %2$s WHERE id = ? AND %1$s IS NOT NULL".formatted(alvo.coluna, alvo.tabela);
        return jdbc.query(sql, (rs, n) -> new Imagem(rs.getBytes(1), rs.getString(2)), id).stream().findFirst();
    }

    void gravar(Alvo alvo, Long id, Imagem imagem) {
        jdbc.update("UPDATE %2$s SET %1$s = ?, %1$s_tipo = ? WHERE id = ?".formatted(alvo.coluna, alvo.tabela),
                imagem.dados(), imagem.tipo(), id);
    }

    void remover(Alvo alvo, Long id) {
        jdbc.update("UPDATE %2$s SET %1$s = NULL, %1$s_tipo = NULL WHERE id = ?".formatted(alvo.coluna, alvo.tabela), id);
    }
}
