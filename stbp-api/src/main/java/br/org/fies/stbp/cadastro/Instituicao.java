package br.org.fies.stbp.cadastro;

import org.hibernate.annotations.Formula;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A logo (bytes) não é mapeada aqui para não ser carregada em toda consulta; ver {@link ImagemRepository}. */
@Entity
@Table(name = "instituicao")
public class Instituicao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;

    /** Bloqueada ({@code false}): não pode ser usada em novas transferências; o histórico continua intacto. */
    private boolean ativa = true;

    @Formula("(logo is not null)")
    private boolean temLogo;

    /** Usada em alguma transferência: nesse caso não pode ser excluída, só bloqueada. */
    @Formula("(exists (select 1 from transferencia t where t.instituicao_id = id))")
    private boolean emUso;

    protected Instituicao() {
    }

    Instituicao(String nome) {
        this.nome = nome;
    }

    void renomear(String nome) {
        this.nome = nome;
    }

    void definirAtiva(boolean ativa) {
        this.ativa = ativa;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public boolean isAtiva() {
        return ativa;
    }

    public boolean isTemLogo() {
        return temLogo;
    }

    public boolean isEmUso() {
        return emUso;
    }
}
