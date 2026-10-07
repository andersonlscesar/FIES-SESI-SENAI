package br.org.fies.stbp.transferencia;

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

import br.org.fies.stbp.cadastro.InstituicaoRepository;
import br.org.fies.stbp.cadastro.ImagemRepository;
import br.org.fies.stbp.cadastro.Unidade;
import br.org.fies.stbp.cadastro.UnidadeRepository;
import br.org.fies.stbp.comum.NaoEncontradoException;
import br.org.fies.stbp.comum.ProibidoException;
import br.org.fies.stbp.comum.RegraNegocioException;
import br.org.fies.stbp.comum.Texto;
import br.org.fies.stbp.seguranca.UsuarioAutenticado;
import br.org.fies.stbp.transferencia.TransferenciaDtos.FiltroTransferencia;
import br.org.fies.stbp.transferencia.TransferenciaDtos.ItemRequest;
import br.org.fies.stbp.transferencia.TransferenciaDtos.Referencia;
import br.org.fies.stbp.transferencia.TransferenciaDtos.TransferenciaDetalhe;
import br.org.fies.stbp.transferencia.TransferenciaDtos.TransferenciaRequest;
import br.org.fies.stbp.transferencia.TransferenciaDtos.TransferenciaResumo;
import br.org.fies.stbp.usuario.Perfil;
import br.org.fies.stbp.usuario.UsuarioRepository;

/**
 * Regras em docs/perfis-e-permissoes.md: todos consultam; TECNICO cria e altera só as próprias; ADMIN altera todas.
 */
@Service
public class TransferenciaService {

    private final TransferenciaRepository transferencias;
    private final InstituicaoRepository instituicoes;
    private final UnidadeRepository unidades;
    private final UsuarioRepository usuarios;
    private final ImagemRepository imagens;
    private final Clock relogio;

    TransferenciaService(TransferenciaRepository transferencias, InstituicaoRepository instituicoes,
            UnidadeRepository unidades, UsuarioRepository usuarios, ImagemRepository imagens, Clock relogio) {
        this.transferencias = transferencias;
        this.instituicoes = instituicoes;
        this.unidades = unidades;
        this.usuarios = usuarios;
        this.imagens = imagens;
        this.relogio = relogio;
    }

    @Transactional(readOnly = true)
    public Page<TransferenciaResumo> listar(FiltroTransferencia filtro, Pageable pagina, UsuarioAutenticado eu) {
        var spec = TransferenciaFiltros.naLixeira(false).and(TransferenciaFiltros.de(filtro));
        if (Boolean.TRUE.equals(filtro.minhas())) {
            spec = spec.and(TransferenciaFiltros.criadaPor(eu.id()));
        }
        return transferencias.findAll(spec, pagina).map(TransferenciaResumo::de);
    }

    /** TECNICO vê a própria lixeira; ADMIN vê a de todos. */
    @Transactional(readOnly = true)
    public Page<TransferenciaResumo> lixeira(Pageable pagina, UsuarioAutenticado eu) {
        Specification<Transferencia> spec = TransferenciaFiltros.naLixeira(true);
        if (!eu.incluiPerfil(Perfil.ADMIN)) {
            spec = spec.and(TransferenciaFiltros.criadaPor(eu.id()));
        }
        return transferencias.findAll(spec, pagina).map(TransferenciaResumo::de);
    }

    @Transactional(readOnly = true)
    public List<Referencia> autores() {
        return transferencias.autores();
    }

    /** Transferências na lixeira só são visíveis para quem pode alterá-las. */
    @Transactional(readOnly = true)
    public TransferenciaDetalhe detalhar(Long id, UsuarioAutenticado eu) {
        var t = carregar(id);
        boolean podeAlterar = podeAlterar(t, eu);
        if (t.naLixeira() && !podeAlterar) {
            throw naoEncontrada();
        }
        return TransferenciaDetalhe.de(t, podeAlterar);
    }

    /** Dados do termo em PDF, com a mesma regra de visibilidade do detalhe. */
    @Transactional(readOnly = true)
    public TermoDados dadosDoTermo(Long id, UsuarioAutenticado eu) {
        var t = carregar(id);
        if (t.naLixeira() && !podeAlterar(t, eu)) {
            throw naoEncontrada();
        }
        return TermoDados.de(t, imagens.buscar(ImagemRepository.Alvo.LOGO_INSTITUICAO, t.getInstituicao().getId()).orElse(null));
    }

    @Transactional
    public TransferenciaDetalhe criar(TransferenciaRequest pedido, UsuarioAutenticado eu) {
        var autor = usuarios.getReferenceById(eu.id());
        var t = new Transferencia(autor);
        preencher(t, pedido);
        return TransferenciaDetalhe.de(transferencias.saveAndFlush(t), true);
    }

    @Transactional
    public TransferenciaDetalhe atualizar(Long id, TransferenciaRequest pedido, UsuarioAutenticado eu) {
        var t = carregarParaAlterar(id, eu);
        if (t.naLixeira()) {
            throw new RegraNegocioException("Restaure a transferência antes de editá-la");
        }
        preencher(t, pedido);
        return TransferenciaDetalhe.de(transferencias.saveAndFlush(t), true);
    }

    @Transactional
    public void moverParaLixeira(Long id, UsuarioAutenticado eu) {
        var t = carregarParaAlterar(id, eu);
        if (t.naLixeira()) {
            throw new RegraNegocioException("A transferência já está na lixeira");
        }
        t.moverParaLixeira(OffsetDateTime.now(relogio));
    }

    @Transactional
    public void restaurar(Long id, UsuarioAutenticado eu) {
        var t = carregarParaAlterar(id, eu);
        if (!t.naLixeira()) {
            throw new RegraNegocioException("A transferência não está na lixeira");
        }
        t.restaurar();
    }

    /** Exclusão definitiva: só a partir da lixeira, para evitar apagar um termo por engano. */
    @Transactional
    public void excluirDefinitivamente(Long id, UsuarioAutenticado eu) {
        var t = carregarParaAlterar(id, eu);
        if (!t.naLixeira()) {
            throw new RegraNegocioException("Mova a transferência para a lixeira antes de excluí-la definitivamente");
        }
        transferencias.delete(t);
    }

    static boolean podeAlterar(Transferencia t, UsuarioAutenticado eu) {
        return eu.incluiPerfil(Perfil.ADMIN)
                || (eu.incluiPerfil(Perfil.TECNICO) && t.getCriadoPor().getId().equals(eu.id()));
    }

    private void preencher(Transferencia t, TransferenciaRequest pedido) {
        var instituicao = instituicoes.findById(pedido.instituicaoId())
                .orElseThrow(() -> new RegraNegocioException("Instituição não encontrada"));
        // Bloqueada: não entra em transferências novas; uma transferência que já a usa pode ser editada sem trocá-la
        boolean mantemAtual = t.getInstituicao() != null && t.getInstituicao().getId().equals(instituicao.getId());
        if (!instituicao.isAtiva() && !mantemAtual) {
            throw new RegraNegocioException("A instituição " + instituicao.getNome() + " está bloqueada para uso");
        }
        var origem = unidadeDa(pedido.origemId(), "origem");
        var destino = unidadeDa(pedido.destinoId(), "destino");
        exigirAtivaOuAtual(origem, t.getOrigem());
        exigirAtivaOuAtual(destino, t.getDestino());
        if (!origem.pertenceA(instituicao) || !destino.pertenceA(instituicao)) {
            throw new RegraNegocioException("As unidades de origem e destino devem pertencer à instituição "
                    + instituicao.getNome());
        }

        t.preencherCabecalho(pedido.data(), pedido.motivo(), instituicao, origem, destino,
                Texto.capitalizarPalavras(pedido.responsavelEnvio()),
                Texto.capitalizarPalavras(pedido.responsavelRecebimento()));
        sincronizarItens(t, pedido.itens());
    }

    /** Itens com id são atualizados, sem id são criados, e os que não vieram na lista são removidos. */
    private static void sincronizarItens(Transferencia t, List<ItemRequest> pedidos) {
        Map<Long, Item> atuais = t.getItens().stream().collect(Collectors.toMap(Item::getId, Function.identity()));
        var usados = new HashSet<Long>();
        var mantidos = new ArrayList<Item>();
        for (var pedido : pedidos) {
            if (pedido.id() == null) {
                continue;
            }
            var item = atuais.get(pedido.id());
            if (item == null) {
                throw new RegraNegocioException("O item " + pedido.id() + " não pertence a esta transferência");
            }
            if (!usados.add(pedido.id())) {
                throw new RegraNegocioException("O item " + pedido.id() + " foi informado mais de uma vez");
            }
            mantidos.add(item);
        }
        t.manterSomente(mantidos);

        short ordem = 1;
        for (var pedido : pedidos) {
            var item = pedido.id() == null ? t.novoItem() : atuais.get(pedido.id());
            item.preencher(ordem++, Texto.primeiraMaiuscula(pedido.descricao()), Texto.patrimonio(pedido.patrimonio()),
                    Texto.opcional(pedido.observacao()));
        }
        t.getItens().sort((a, b) -> Short.compare(a.getOrdem(), b.getOrdem()));
    }

    /** Unidade bloqueada só é aceita se já era a mesma desta transferência (edição do histórico). */
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

    private Transferencia carregar(Long id) {
        return transferencias.findById(id).orElseThrow(TransferenciaService::naoEncontrada);
    }

    private Transferencia carregarParaAlterar(Long id, UsuarioAutenticado eu) {
        var t = carregar(id);
        if (!podeAlterar(t, eu)) {
            if (t.naLixeira()) {
                throw naoEncontrada();
            }
            throw new ProibidoException("Somente o autor ou um administrador pode alterar esta transferência");
        }
        return t;
    }

    private static NaoEncontradoException naoEncontrada() {
        return new NaoEncontradoException("Transferência não encontrada");
    }
}
