package br.org.fies.stbp.usuario;

import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.fies.stbp.comum.ConflitoException;
import br.org.fies.stbp.comum.NaoEncontradoException;
import br.org.fies.stbp.comum.ProibidoException;
import br.org.fies.stbp.comum.RegraNegocioException;
import br.org.fies.stbp.seguranca.UsuarioAutenticado;
import br.org.fies.stbp.usuario.UsuarioDtos.AtualizarUsuarioRequest;
import br.org.fies.stbp.usuario.UsuarioDtos.CriarUsuarioRequest;

/**
 * Gestão de usuários por ADMIN/SUPERADMIN. Regras em docs/perfis-e-permissoes.md:
 * só SUPERADMIN cria, promove ou altera SUPERADMIN (D-011); ninguém bloqueia, exclui ou rebaixa a si mesmo.
 */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;

    UsuarioService(UsuarioRepository usuarios, PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.encoder = encoder;
    }

    @Transactional(readOnly = true)
    public Page<UsuarioResponse> listar(String busca, Perfil perfil, StatusUsuario status, Pageable pagina) {
        return usuarios.findAll(filtro(busca, perfil, status), pagina).map(UsuarioResponse::de);
    }

    @Transactional(readOnly = true)
    public UsuarioResponse buscar(Long id) {
        return UsuarioResponse.de(carregar(id));
    }

    @Transactional
    public UsuarioResponse criar(CriarUsuarioRequest pedido, UsuarioAutenticado autor) {
        exigirPodeAtribuir(pedido.perfil(), autor);
        String login = normalizarLogin(pedido.login());
        String email = normalizarEmail(pedido.email());
        exigirUnico(login, email, null);

        var usuario = new Usuario(pedido.nome().trim(), login, email, encoder.encode(pedido.senha()), pedido.perfil());
        return UsuarioResponse.de(usuarios.save(usuario));
    }

    @Transactional
    public UsuarioResponse atualizar(Long id, AtualizarUsuarioRequest pedido, UsuarioAutenticado autor) {
        var usuario = carregarParaAlterar(id, autor);
        exigirPodeAtribuir(pedido.perfil(), autor);
        if (usuario.getId().equals(autor.id()) && pedido.perfil() != usuario.getPerfil()) {
            throw new RegraNegocioException("Você não pode alterar o próprio perfil");
        }
        String login = normalizarLogin(pedido.login());
        String email = normalizarEmail(pedido.email());
        exigirUnico(login, email, id);

        usuario.atualizarDados(pedido.nome().trim(), login, email, pedido.perfil());
        return UsuarioResponse.de(usuario);
    }

    @Transactional
    public void redefinirSenha(Long id, String novaSenha, UsuarioAutenticado autor) {
        carregarParaAlterar(id, autor).redefinirSenha(encoder.encode(novaSenha));
    }

    @Transactional
    public UsuarioResponse bloquear(Long id, UsuarioAutenticado autor) {
        return transicionar(id, autor, Set.of(StatusUsuario.ATIVO), StatusUsuario.BLOQUEADO,
                "Só é possível bloquear um usuário ativo");
    }

    @Transactional
    public UsuarioResponse desbloquear(Long id, UsuarioAutenticado autor) {
        return transicionar(id, autor, Set.of(StatusUsuario.BLOQUEADO), StatusUsuario.ATIVO,
                "O usuário não está bloqueado");
    }

    /**
     * Exclusão lógica (lixeira, restaurável). Só para quem nunca criou transferências: o histórico registra o autor
     * de cada termo, então usuários com transferências são bloqueados em vez de excluídos (D-035).
     */
    @Transactional
    public UsuarioResponse excluir(Long id, UsuarioAutenticado autor) {
        if (carregarParaAlterar(id, autor).isEmUso()) {
            throw new ConflitoException(
                    "O usuário possui transferências e não pode ser excluído. Bloqueie-o para impedir o acesso");
        }
        return transicionar(id, autor, Set.of(StatusUsuario.ATIVO, StatusUsuario.BLOQUEADO), StatusUsuario.EXCLUIDO,
                "O usuário já está excluído");
    }

    @Transactional
    public UsuarioResponse restaurar(Long id, UsuarioAutenticado autor) {
        return transicionar(id, autor, Set.of(StatusUsuario.EXCLUIDO), StatusUsuario.ATIVO,
                "O usuário não está excluído");
    }

    private UsuarioResponse transicionar(Long id, UsuarioAutenticado autor, Set<StatusUsuario> origensPermitidas,
            StatusUsuario destino, String mensagemSeInvalido) {
        var usuario = carregarParaAlterar(id, autor);
        if (usuario.getId().equals(autor.id())) {
            throw new RegraNegocioException("Você não pode bloquear, excluir ou restaurar a si mesmo");
        }
        if (!origensPermitidas.contains(usuario.getStatus())) {
            throw new RegraNegocioException(mensagemSeInvalido);
        }
        usuario.alterarStatus(destino);
        return UsuarioResponse.de(usuario);
    }

    private Usuario carregar(Long id) {
        return usuarios.findById(id).orElseThrow(() -> new NaoEncontradoException("Usuário não encontrado"));
    }

    private Usuario carregarParaAlterar(Long id, UsuarioAutenticado autor) {
        var usuario = carregar(id);
        if (usuario.getPerfil() == Perfil.SUPERADMIN && autor.perfil() != Perfil.SUPERADMIN) {
            throw new ProibidoException("Somente um SUPERADMIN pode alterar outro SUPERADMIN");
        }
        return usuario;
    }

    private static void exigirPodeAtribuir(Perfil perfil, UsuarioAutenticado autor) {
        if (perfil == Perfil.SUPERADMIN && autor.perfil() != Perfil.SUPERADMIN) {
            throw new ProibidoException("Somente um SUPERADMIN pode atribuir o perfil SUPERADMIN");
        }
    }

    private void exigirUnico(String login, String email, Long idAtual) {
        usuarios.findByLoginIgnoreCase(login).filter(u -> !u.getId().equals(idAtual)).ifPresent(u -> {
            throw new ConflitoException("Login já está em uso");
        });
        usuarios.findByEmailIgnoreCase(email).filter(u -> !u.getId().equals(idAtual)).ifPresent(u -> {
            throw new ConflitoException("E-mail já está em uso");
        });
    }

    private static String normalizarLogin(String login) {
        return login.trim().toLowerCase();
    }

    private static String normalizarEmail(String email) {
        return email.trim().toLowerCase();
    }

    /** Sem filtro de status, a listagem esconde os excluídos (que ficam na "lixeira": status=EXCLUIDO). */
    private static Specification<Usuario> filtro(String busca, Perfil perfil, StatusUsuario status) {
        return (raiz, consulta, cb) -> {
            var condicoes = cb.conjunction();
            if (busca != null && !busca.isBlank()) {
                String termo = "%" + busca.trim().toLowerCase() + "%";
                condicoes = cb.and(condicoes, cb.or(
                        cb.like(cb.lower(raiz.get("nome")), termo),
                        cb.like(cb.lower(raiz.get("login")), termo),
                        cb.like(cb.lower(raiz.get("email")), termo)));
            }
            if (perfil != null) {
                condicoes = cb.and(condicoes, cb.equal(raiz.get("perfil"), perfil));
            }
            condicoes = cb.and(condicoes, status != null
                    ? cb.equal(raiz.get("status"), status)
                    : cb.notEqual(raiz.get("status"), StatusUsuario.EXCLUIDO));
            return condicoes;
        };
    }
}
