package br.org.fies.stbp.saida;

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

/**
 * Controle de Saída de Materiais da Unidade (FM-072-UOP-04). O destino é uma unidade cadastrada ou, quando o
 * material sai da instituição (manutenção externa, evento), um texto livre em {@code destinoExterno}.
 */
@Entity
@Table(name = "saida_material")
public class SaidaMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate data;

    @Enumerated(EnumType.STRING)
    private TipoSaida tipo;

    private String tipoOutro;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Instituicao instituicao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Unidade origem;

    @ManyToOne(fetch = FetchType.LAZY)
    private Unidade destino;

    private String destinoExterno;

    private String portador;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criado_por_id", updatable = false)
    private Usuario criadoPor;

    @OneToMany(mappedBy = "saida", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordem")
    private List<ItemSaida> itens = new ArrayList<>();

    /** Calculado na consulta, para a listagem não precisar carregar os itens. */
    @Formula("(select count(*) from saida_material_item i where i.saida_id = id)")
    private int quantidadeItens;

    @CreationTimestamp
    @Column(updatable = false)
    private OffsetDateTime criadoEm;

    @UpdateTimestamp
    private OffsetDateTime atualizadoEm;

    /** Preenchido quando a saída está na lixeira. */
    private OffsetDateTime excluidoEm;

    protected SaidaMaterial() {
    }

    SaidaMaterial(Usuario criadoPor) {
        this.criadoPor = criadoPor;
    }

    void preencherCabecalho(LocalDate data, TipoSaida tipo, String tipoOutro, Instituicao instituicao, Unidade origem,
            Unidade destino, String destinoExterno, String portador) {
        this.data = data;
        this.tipo = tipo;
        this.tipoOutro = tipoOutro;
        this.instituicao = instituicao;
        this.origem = origem;
        this.destino = destino;
        this.destinoExterno = destinoExterno;
        this.portador = portador;
    }

    /** Remove da lista os itens que não estão em {@code manter}; o orphanRemoval apaga do banco. */
    void manterSomente(List<ItemSaida> manter) {
        itens.retainAll(manter);
    }

    ItemSaida novoItem() {
        var item = new ItemSaida(this);
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

    /** Nome do destino como sai impresso: a unidade ou o destino externo. */
    public String getNomeDestino() {
        return destino != null ? destino.getNome() : destinoExterno;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getData() {
        return data;
    }

    public TipoSaida getTipo() {
        return tipo;
    }

    public String getTipoOutro() {
        return tipoOutro;
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

    public String getDestinoExterno() {
        return destinoExterno;
    }

    public String getPortador() {
        return portador;
    }

    public Usuario getCriadoPor() {
        return criadoPor;
    }

    public List<ItemSaida> getItens() {
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
