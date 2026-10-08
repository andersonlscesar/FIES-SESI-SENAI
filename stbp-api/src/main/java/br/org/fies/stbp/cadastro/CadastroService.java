package br.org.fies.stbp.cadastro;

import static br.org.fies.stbp.cadastro.ImagemRepository.Alvo.FOTO_UNIDADE;
import static br.org.fies.stbp.cadastro.ImagemRepository.Alvo.LOGO_INSTITUICAO;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.fies.stbp.cadastro.CadastroDtos.InstituicaoResponse;
import br.org.fies.stbp.cadastro.CadastroDtos.UnidadeRequest;
import br.org.fies.stbp.cadastro.CadastroDtos.UnidadeResponse;
import br.org.fies.stbp.comum.ConflitoException;
import br.org.fies.stbp.comum.NaoEncontradoException;
import br.org.fies.stbp.comum.RegraNegocioException;

/**
 * Cadastro de instituições e unidades (escrita restrita a ADMIN no controller). Nomes são gravados em maiúsculas,
 * como já estavam no sistema antigo e como saem no termo. Registros usados em transferências não podem ser excluídos.
 */
@Service
public class CadastroService {

    private static final Locale PT_BR = Locale.of("pt", "BR");

    private final InstituicaoRepository instituicoes;
    private final UnidadeRepository unidades;
    private final ImagemRepository imagens;

    CadastroService(InstituicaoRepository instituicoes, UnidadeRepository unidades, ImagemRepository imagens) {
        this.instituicoes = instituicoes;
        this.unidades = unidades;
        this.imagens = imagens;
    }

    // ---- Instituições

    @Transactional(readOnly = true)
    public List<InstituicaoResponse> listarInstituicoes() {
        return instituicoes.findAll(Sort.by("nome")).stream().map(InstituicaoResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public InstituicaoResponse buscarInstituicao(Long id) {
        return InstituicaoResponse.de(carregarInstituicao(id));
    }

    @Transactional
    public InstituicaoResponse criarInstituicao(String nome) {
        String normalizado = normalizarNome(nome);
        exigirNomeInstituicaoLivre(normalizado, null);
        return InstituicaoResponse.de(instituicoes.saveAndFlush(new Instituicao(normalizado)));
    }

    @Transactional
    public InstituicaoResponse renomearInstituicao(Long id, String nome) {
        var instituicao = carregarInstituicao(id);
        String normalizado = normalizarNome(nome);
        exigirNomeInstituicaoLivre(normalizado, id);
        instituicao.renomear(normalizado);
        return InstituicaoResponse.de(instituicao);
    }

    /**
     * Remove também os vínculos com unidades. Instituição já usada em transferências ou saídas de materiais não pode ser excluída
     * (o histórico depende dela): deve ser bloqueada (D-033).
     */
    @Transactional
    public void excluirInstituicao(Long id) {
        var instituicao = carregarInstituicao(id);
        if (instituicao.isEmUso()) {
            throw new ConflitoException(
                    "A instituição possui transferências ou saídas de materiais e não pode ser excluída. Bloqueie-a para impedir novos usos");
        }
        instituicoes.desvincularUnidades(id);
        instituicoes.delete(instituicao);
    }

    /** Bloqueada, a instituição deixa de aceitar novas transferências; o histórico e os termos continuam intactos. */
    @Transactional
    public InstituicaoResponse bloquearInstituicao(Long id) {
        var instituicao = carregarInstituicao(id);
        if (!instituicao.isAtiva()) {
            throw new RegraNegocioException("A instituição já está bloqueada");
        }
        instituicao.definirAtiva(false);
        return InstituicaoResponse.de(instituicao);
    }

    @Transactional
    public InstituicaoResponse desbloquearInstituicao(Long id) {
        var instituicao = carregarInstituicao(id);
        if (instituicao.isAtiva()) {
            throw new RegraNegocioException("A instituição não está bloqueada");
        }
        instituicao.definirAtiva(true);
        return InstituicaoResponse.de(instituicao);
    }

    @Transactional(readOnly = true)
    public Imagem buscarLogo(Long id) {
        return imagens.buscar(LOGO_INSTITUICAO, id).orElseThrow(() -> new NaoEncontradoException("Instituição sem logo"));
    }

    @Transactional
    public void definirLogo(Long id, Imagem logo) {
        carregarInstituicao(id);
        imagens.gravar(LOGO_INSTITUICAO, id, logo);
    }

    @Transactional
    public void removerLogo(Long id) {
        carregarInstituicao(id);
        imagens.remover(LOGO_INSTITUICAO, id);
    }

    // ---- Unidades

    @Transactional(readOnly = true)
    public List<UnidadeResponse> listarUnidades(Long instituicaoId) {
        return unidades.findAllByOrderByNome().stream()
                .filter(u -> instituicaoId == null
                        || u.getInstituicoes().stream().anyMatch(i -> i.getId().equals(instituicaoId)))
                .map(UnidadeResponse::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public UnidadeResponse buscarUnidade(Long id) {
        return UnidadeResponse.de(carregarUnidade(id));
    }

    @Transactional
    public UnidadeResponse criarUnidade(UnidadeRequest pedido) {
        String nome = normalizarNome(pedido.nome());
        exigirNomeUnidadeLivre(nome, null);
        return UnidadeResponse.de(unidades.saveAndFlush(new Unidade(nome, carregarInstituicoes(pedido.instituicaoIds()))));
    }

    @Transactional
    public UnidadeResponse atualizarUnidade(Long id, UnidadeRequest pedido) {
        var unidade = carregarUnidade(id);
        String nome = normalizarNome(pedido.nome());
        exigirNomeUnidadeLivre(nome, id);
        unidade.atualizar(nome, carregarInstituicoes(pedido.instituicaoIds()));
        return UnidadeResponse.de(unidade);
    }

    @Transactional
    public void excluirUnidade(Long id) {
        var unidade = carregarUnidade(id);
        if (unidade.isEmUso()) {
            throw new ConflitoException(
                    "A unidade possui transferências ou saídas de materiais e não pode ser excluída. Bloqueie-a para impedir novos usos");
        }
        unidades.delete(unidade);
    }

    /** Bloqueada, a unidade deixa de ser aceita como origem ou destino de novas transferências (D-035). */
    @Transactional
    public UnidadeResponse bloquearUnidade(Long id) {
        var unidade = carregarUnidade(id);
        if (!unidade.isAtiva()) {
            throw new RegraNegocioException("A unidade já está bloqueada");
        }
        unidade.definirAtiva(false);
        return UnidadeResponse.de(unidade);
    }

    @Transactional
    public UnidadeResponse desbloquearUnidade(Long id) {
        var unidade = carregarUnidade(id);
        if (unidade.isAtiva()) {
            throw new RegraNegocioException("A unidade não está bloqueada");
        }
        unidade.definirAtiva(true);
        return UnidadeResponse.de(unidade);
    }

    @Transactional(readOnly = true)
    public Imagem buscarFotoUnidade(Long id) {
        return imagens.buscar(FOTO_UNIDADE, id).orElseThrow(() -> new NaoEncontradoException("Unidade sem foto"));
    }

    @Transactional
    public void definirFotoUnidade(Long id, Imagem foto) {
        carregarUnidade(id);
        imagens.gravar(FOTO_UNIDADE, id, foto);
    }

    @Transactional
    public void removerFotoUnidade(Long id) {
        carregarUnidade(id);
        imagens.remover(FOTO_UNIDADE, id);
    }

    // ---- Apoio

    private Instituicao carregarInstituicao(Long id) {
        return instituicoes.findById(id).orElseThrow(() -> new NaoEncontradoException("Instituição não encontrada"));
    }

    private Unidade carregarUnidade(Long id) {
        return unidades.findById(id).orElseThrow(() -> new NaoEncontradoException("Unidade não encontrada"));
    }

    private Set<Instituicao> carregarInstituicoes(Set<Long> ids) {
        var encontradas = new HashSet<>(instituicoes.findAllById(ids));
        if (encontradas.size() != ids.size()) {
            throw new RegraNegocioException("Instituição não encontrada");
        }
        return encontradas;
    }

    private void exigirNomeInstituicaoLivre(String nome, Long idAtual) {
        instituicoes.findByNomeIgnoreCase(nome).filter(i -> !i.getId().equals(idAtual)).ifPresent(i -> {
            throw new ConflitoException("Já existe uma instituição com esse nome");
        });
    }

    private void exigirNomeUnidadeLivre(String nome, Long idAtual) {
        unidades.findByNomeIgnoreCase(nome).filter(u -> !u.getId().equals(idAtual)).ifPresent(u -> {
            throw new ConflitoException("Já existe uma unidade com esse nome");
        });
    }

    private static String normalizarNome(String nome) {
        return nome.trim().replaceAll("\\s+", " ").toUpperCase(PT_BR);
    }
}
