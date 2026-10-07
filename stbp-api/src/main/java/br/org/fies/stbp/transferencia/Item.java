package br.org.fies.stbp.transferencia;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "item")
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transferencia_id")
    private Transferencia transferencia;

    /** Número do item no termo (1, 2, 3...). */
    private short ordem;

    private String descricao;

    /** {@code null} = sem patrimônio (impresso como "S/P"). */
    private String patrimonio;

    @Column(columnDefinition = "text")
    private String observacao;

    protected Item() {
    }

    Item(Transferencia transferencia) {
        this.transferencia = transferencia;
    }

    void preencher(short ordem, String descricao, String patrimonio, String observacao) {
        this.ordem = ordem;
        this.descricao = descricao;
        this.patrimonio = patrimonio;
        this.observacao = observacao;
    }

    public Long getId() {
        return id;
    }

    public short getOrdem() {
        return ordem;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getPatrimonio() {
        return patrimonio;
    }

    public String getObservacao() {
        return observacao;
    }
}
