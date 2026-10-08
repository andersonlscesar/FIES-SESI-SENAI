package br.org.fies.stbp.saida;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.fies.stbp.cadastro.ImagemRepository;
import br.org.fies.stbp.cadastro.InstituicaoRepository;
import br.org.fies.stbp.cadastro.Unidade;
import br.org.fies.stbp.cadastro.UnidadeRepository;
import br.org.fies.stbp.comum.NaoEncontradoException;
import br.org.fies.stbp.comum.ProibidoException;
import br.org.fies.stbp.comum.RegraNegocioException;
import br.org.fies.stbp.comum.Texto;
import br.org.fies.stbp.saida.SaidaDtos.FiltroSaida;
import br.org.fies.stbp.saida.SaidaDtos.ItemSaidaRequest;
import br.org.fies.stbp.saida.SaidaDtos.Referencia;
import br.org.fies.stbp.saida.SaidaDtos.SaidaDetalhe;
import br.org.fies.stbp.saida.SaidaDtos.SaidaRequest;
import br.org.fies.stbp.saida.SaidaDtos.SaidaResumo;
import br.org.fies.stbp.seguranca.UsuarioAutenticado;
import br.org.fies.stbp.usuario.Perfil;
import br.org.fies.stbp.usuario.UsuarioRepository;

/**
 * Controle de Saída de Materiais. Mesmas regras de acesso das transferências (docs/perfis-e-permissoes.md): todos
 * consultam; TECNICO cria e altera só as próprias; ADMIN altera todas; lixeira antes da exclusão definitiva.
 */
@Service
public class SaidaService {

    private final SaidaRepository saidas;
    private final InstituicaoRepository instituicoes;
    private final UnidadeRepository unidades;
    private final UsuarioRepository usuarios;
    private final ImagemRepository imagens;
    private final Clock relogio;

    SaidaService(SaidaRepository saidas, InstituicaoRepository instituicoes, UnidadeRepository unidades,
            UsuarioRepository usuarios, ImagemRepository imagens, Clock relogio) {
        this.saidas = saidas;
        this.instituicoes = instituicoes;
        this.unidades = unidades;
        this.usuarios = usuarios;
        this.imagens = imagens;
        this.relogio = relogio;
    }

    @Transactional(readOnly = true)
    public Page<SaidaResumo> listar(FiltroSaida filtro, Pageable pagina, UsuarioAutenticado eu) {
        var spec = SaidaFiltros.naLixeira(false).and(SaidaFiltros.de(filtro));
        if (Boolean.TRUE.equals(filtro.minhas())) {
            spec = spec.and(SaidaFiltros.criadaPor(eu.id()));
        }
        return saidas.findAll(spec, pagina).map(SaidaResumo::de);
    }

    /** TECNICO vê a própria lixeira; ADMIN vê a de todos. */
    @Transactional(readOnly = true)
    public Page<SaidaResumo> lixeira(Pageable pagina, UsuarioAutenticado eu) {
        Specification<SaidaMaterial> spec = SaidaFiltros.naLixeira(true);
        if (!eu.incluiPerfil(Perfil.ADMIN)) {
            spec = spec.and(SaidaFiltros.criadaPor(eu.id()));
        }
        return saidas.findAll(spec, pagina).map(SaidaResumo::de);
    }

    @Transactional(readOnly = true)
    public List<Referencia> autores() {
        return saidas.autores();
    }

    /** Saídas na lixeira só são visíveis para quem pode alterá-las. */
    @Transactional(readOnly = true)
    public SaidaDetalhe detalhar(Long id, UsuarioAutenticado eu) {
        var s = carregar(id);
        boolean podeAlterar = podeAlterar(s, eu);
        if (s.naLixeira() && !podeAlterar) {
            throw naoEncontrada();
        }
        return SaidaDetalhe.de(s, podeAlterar);
    }

    /** Dados do formulário em PDF, com a mesma regra de visibilidade do detalhe. */
    @Transactional(readOnly = true)
    public ControleSaidaDados dadosDoFormulario(Long id, UsuarioAutenticado eu) {
        var s = carregar(id);
        if (s.naLixeira() && !podeAlterar(s, eu)) {
            throw naoEncontrada();
        }
        return ControleSaidaDados.de(s,
                imagens.buscar(ImagemRepository.Alvo.LOGO_INSTITUICAO, s.getInstituicao().getId()).orElse(null));
    }

    @Transactional
    public SaidaDetalhe criar(SaidaRequest pedido, UsuarioAutenticado eu) {
        var s = new SaidaMaterial(usuarios.getReferenceById(eu.id()));
        preencher(s, pedido);
        return SaidaDetalhe.de(saidas.saveAndFlush(s), true);
    }

    @Transactional
    public SaidaDetalhe atualizar(Long id, SaidaRequest pedido, UsuarioAutenticado eu) {
        var s = carregarParaAlterar(id, eu);
        if (s.naLixeira()) {
            throw new RegraNegocioException("Restaure a saída antes de editá-la");
        }
        preencher(s, pedido);
        return SaidaDetalhe.de(saidas.saveAndFlush(s), true);
    }

    @Transactional
    public void moverParaLixeira(Long id, UsuarioAutenticado eu) {
        var s = carregarParaAlterar(id, eu);
        if (s.naLixeira()) {
            throw new RegraNegocioException("A saída já está na lixeira");
        }
        s.moverParaLixeira(OffsetDateTime.now(relogio));
    }

    @Transactional
    public void restaurar(Long id, UsuarioAutenticado eu) {
        var s = carregarParaAlterar(id, eu);
        if (!s.naLixeira()) {
            throw new RegraNegocioException("A saída não está na lixeira");
        }
        s.restaurar();
    }

    /** Exclusão definitiva (com os itens): só a partir da lixeira. */
    @Transactional
    public void excluirDefinitivamente(Long id, UsuarioAutenticado eu) {
        var s = carregarParaAlterar(id, eu);
        if (!s.naLixeira()) {
            throw new RegraNegocioException("Mova a saída para a lixeira antes de excluí-la definitivamente");
        }
        saidas.delete(s);
    }

    static boolean podeAlterar(SaidaMaterial s, UsuarioAutenticado eu) {
        return eu.incluiPerfil(Perfil.ADMIN)
                || (eu.incluiPerfil(Perfil.TECNICO) && s.getCriadoPor().getId().equals(eu.id()));
    }

    private void preencher(SaidaMaterial s, SaidaRequest pedido) {
        var instituicao = instituicoes.findById(pedido.instituicaoId())
                .orElseThrow(() -> new RegraNegocioException("Instituição não encontrada"));
        boolean mantemInstituicao = s.getInstituicao() != null && s.getInstituicao().getId().equals(instituicao.getId());
        if (!instituicao.isAtiva() && !mantemInstituicao) {
            throw new RegraNegocioException("A instituição " + instituicao.getNome() + " está bloqueada para uso");
        }

        var origem = unidadeDa(pedido.origemId(), "origem");
        exigirAtivaOuAtual(origem, s.getOrigem());
        if (!origem.pertenceA(instituicao)) {
            throw new RegraNegocioException("A unidade de origem deve pertencer à instituição " + instituicao.getNome());
        }

        String destinoExterno = Texto.opcional(pedido.destinoExterno());
        if ((pedido.destinoId() == null) == (destinoExterno == null)) {
            throw new RegraNegocioException("Informe o destino: uma unidade ou um destino externo");
        }
        Unidade destino = null;
        if (pedido.destinoId() != null) {
            destino = unidadeDa(pedido.destinoId(), "destino");
            exigirAtivaOuAtual(destino, s.getDestino());
            if (!destino.pertenceA(instituicao)) {
                throw new RegraNegocioException(
                        "A unidade de destino deve pertencer à instituição " + instituicao.getNome());
            }
        }

        String tipoOutro = Texto.opcional(pedido.tipoOutro());
        if (pedido.tipo() == TipoSaida.OUTRO && tipoOutro == null) {
            throw new RegraNegocioException("Informe qual é o outro tipo de saída");
        }
        if (pedido.tipo() != TipoSaida.OUTRO) {
            tipoOutro = null;
        }

        s.preencherCabecalho(pedido.data(), pedido.tipo(), Texto.primeiraMaiuscula(tipoOutro), instituicao, origem,
                destino, destinoExterno, Texto.capitalizarPalavras(Texto.opcional(pedido.portador())));
        sincronizarItens(s, pedido.itens());
    }

    /** Itens com id são atualizados, sem id são criados, e os que não vieram na lista são removidos. */
    private static void sincronizarItens(SaidaMaterial s, List<ItemSaidaRequest> pedidos) {
        Map<Long, ItemSaida> atuais = s.getItens().stream()
                .collect(Collectors.toMap(ItemSaida::getId, Function.identity()));
        var usados = new HashSet<Long>();
        var mantidos = new ArrayList<ItemSaida>();
        for (var pedido : pedidos) {
            if (pedido.id() == null) {
                continue;
            }
            var item = atuais.get(pedido.id());
            if (item == null) {
                throw new RegraNegocioException("O item " + pedido.id() + " não pertence a esta saída");
            }
            if (!usados.add(pedido.id())) {
                throw new RegraNegocioException("O item " + pedido.id() + " foi informado mais de uma vez");
            }
            mantidos.add(item);
        }
        s.manterSomente(mantidos);

        short ordem = 1;
        for (var pedido : pedidos) {
            var item = pedido.id() == null ? s.novoItem() : atuais.get(pedido.id());
            item.preencher(ordem++, Texto.primeiraMaiuscula(pedido.descricao()),
                    Texto.primeiraMaiuscula(Texto.opcional(pedido.areaSaida())),
                    Texto.primeiraMaiuscula(Texto.opcional(pedido.areaEntrada())), Texto.opcional(pedido.observacao()));
        }
        s.getItens().sort((a, b) -> Short.compare(a.getOrdem(), b.getOrdem()));
    }

    /** Unidade bloqueada só é aceita se já era a mesma desta saída (edição do histórico). */
    private static void exigirAtivaOuAtual(Unidade escolhida, Unidade atual) {
        boolean mantemAtual = atual != null && atual.getId().equals(escolhida.getId());
        if (!escolhida.isAtiva() && !mantemAtual) {
            throw new RegraNegocioException("A unidade " + escolhida.getNome() + " está bloqueada para uso");
        }
    }

    private Unidade unidadeDa(Long id, String papel) {
        return unidades.findById(id)
                .orElseThrow(() -> new RegraNegocioException("Unidade de " + papel + " não encontrada"));
    }

    private SaidaMaterial carregar(Long id) {
        return saidas.findById(id).orElseThrow(SaidaService::naoEncontrada);
    }

    private SaidaMaterial carregarParaAlterar(Long id, UsuarioAutenticado eu) {
        var s = carregar(id);
        if (!podeAlterar(s, eu)) {
            if (s.naLixeira()) {
                throw naoEncontrada();
            }
            throw new ProibidoException("Somente o autor ou um administrador pode alterar esta saída");
        }
        return s;
    }

    private static NaoEncontradoException naoEncontrada() {
        return new NaoEncontradoException("Saída de materiais não encontrada");
    }
}
