package br.org.fies.stbp.transferencia;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.UpdateTimestamp;

import br.org.fies.stbp.cadastro.Instituicao;
import br.org.fies.stbp.cadastro.Unidade;
import br.org.fies.stbp.usuario.Usuario;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

@Entity
@Table(name = "transferencia")
public class Transferencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate data;

    @Enumerated(EnumType.STRING)
    private Motivo motivo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Instituicao instituicao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Unidade origem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Unidade destino;

    private String responsavelEnvio;

    private String responsavelRecebimento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criado_por_id", updatable = false)
    private Usuario criadoPor;

    @OneToMany(mappedBy = "transferencia", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordem")
    private List<Item> itens = new ArrayList<>();

    /** Calculado na consulta, para a listagem não precisar carregar os itens. */
    @Formula("(select count(*) from item i where i.transferencia_id = id)")
    private int quantidadeItens;

    @CreationTimestamp
    @Column(updatable = false)
    private OffsetDateTime criadoEm;

    @UpdateTimestamp
    private OffsetDateTime atualizadoEm;

    /** Preenchido quando a transferência está na lixeira. */
    private OffsetDateTime excluidoEm;

    protected Transferencia() {
    }

    Transferencia(Usuario criadoPor) {
        this.criadoPor = criadoPor;
    }

    void preencherCabecalho(LocalDate data, Motivo motivo, Instituicao instituicao, Unidade origem, Unidade destino,
            String responsavelEnvio, String responsavelRecebimento) {
        this.data = data;
        this.motivo = motivo;
        this.instituicao = instituicao;
        this.origem = origem;
        this.destino = destino;
        this.responsavelEnvio = responsavelEnvio;
        this.responsavelRecebimento = responsavelRecebimento;
    }

    /** Remove da lista os itens que não estão em {@code manter}; o orphanRemoval apaga do banco. */
    void manterSomente(List<Item> manter) {
        itens.retainAll(manter);
    }

    Item novoItem() {
        var item = new Item(this);
        itens.add(item);
        return item;
    }

    boolean naLixeira() {
        return excluidoEm != null;
    }

    void moverParaLixeira(OffsetDateTime quando) {
        this.excluidoEm = quando;
    }

    void restaurar() {
        this.excluidoEm = null;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getData() {
        return data;
    }

    public Motivo getMotivo() {
        return motivo;
    }

    public Instituicao getInstituicao() {
        return instituicao;
    }

    public Unidade getOrigem() {
        return origem;
    }

    public Unidade getDestino() {
        return destino;
    }

    public String getResponsavelEnvio() {
        return responsavelEnvio;
    }

    public String getResponsavelRecebimento() {
        return responsavelRecebimento;
    }

    public Usuario getCriadoPor() {
        return criadoPor;
    }

    public List<Item> getItens() {
        return itens;
    }

    public int getQuantidadeItens() {
        return quantidadeItens;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }

    public OffsetDateTime getAtualizadoEm() {
        return atualizadoEm;
    }

    public OffsetDateTime getExcluidoEm() {
        return excluidoEm;
    }
}
