package br.org.fies.stbp.saida;

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
@Table(name = "saida_material_item")
public class ItemSaida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "saida_id")
    private SaidaMaterial saida;

    /** Número do item no formulário (1, 2, 3...). */
    private short ordem;

    private String descricao;

    /** Setor, oficina ou laboratório de onde o material sai. */
    private String areaSaida;

    /** Setor, oficina ou laboratório para onde o material vai. */
    private String areaEntrada;

    @Column(columnDefinition = "text")
    private String observacao;

    protected ItemSaida() {
    }

    ItemSaida(SaidaMaterial saida) {
        this.saida = saida;
    }

    void preencher(short ordem, String descricao, String areaSaida, String areaEntrada, String observacao) {
        this.ordem = ordem;
        this.descricao = descricao;
        this.areaSaida = areaSaida;
        this.areaEntrada = areaEntrada;
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

    public String getAreaSaida() {
        return areaSaida;
    }

    public String getAreaEntrada() {
        return areaEntrada;
    }

    public String getObservacao() {
        return observacao;
    }
}
