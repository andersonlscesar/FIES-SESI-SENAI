package br.org.fies.stbp.cadastro;

import java.util.HashSet;
import java.util.Set;

import org.hibernate.annotations.Formula;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "unidade")
public class Unidade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;

    /** Bloqueada ({@code false}): não pode ser origem nem destino de novas transferências; o histórico continua. */
    private boolean ativa = true;

    /** Usada como origem ou destino de alguma transferência: não pode ser excluída, só bloqueada. */
    @Formula("(exists (select 1 from transferencia t where t.origem_id = id or t.destino_id = id))")
    private boolean emUso;

    /** A foto (bytes) não é mapeada aqui; ver {@link ImagemRepository}. */
    @Formula("(imagem is not null)")
    private boolean temImagem;

    /** Instituições às quais a unidade pertence (uma unidade pode atender SESI e SENAI). */
    @ManyToMany
    @JoinTable(name = "unidade_instituicao",
            joinColumns = @JoinColumn(name = "unidade_id"),
            inverseJoinColumns = @JoinColumn(name = "instituicao_id"))
    private Set<Instituicao> instituicoes = new HashSet<>();

    protected Unidade() {
    }

    Unidade(String nome, Set<Instituicao> instituicoes) {
        atualizar(nome, instituicoes);
    }

    void atualizar(String nome, Set<Instituicao> instituicoes) {
        this.nome = nome;
        this.instituicoes.clear();
        this.instituicoes.addAll(instituicoes);
    }

    void definirAtiva(boolean ativa) {
        this.ativa = ativa;
    }

    public boolean isAtiva() {
        return ativa;
    }

    public boolean isEmUso() {
        return emUso;
    }

    public boolean pertenceA(Instituicao instituicao) {
        return instituicoes.stream().anyMatch(i -> i.getId().equals(instituicao.getId()));
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public Set<Instituicao> getInstituicoes() {
        return instituicoes;
    }

    /** Endereço público da foto, ou {@code null} se a unidade não tiver foto. */
    public String getImagemUrl() {
        return temImagem ? "/api/unidades/" + id + "/imagem" : null;
    }
}
