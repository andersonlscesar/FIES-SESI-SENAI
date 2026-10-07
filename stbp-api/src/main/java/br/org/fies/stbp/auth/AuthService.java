package br.org.fies.stbp.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.fies.stbp.auth.AuthDtos.LoginResponse;
import br.org.fies.stbp.comum.NaoEncontradoException;
import br.org.fies.stbp.comum.RegraNegocioException;
import br.org.fies.stbp.seguranca.LimitadorTentativasLogin;
import br.org.fies.stbp.seguranca.TokenService;
import br.org.fies.stbp.usuario.StatusUsuario;
import br.org.fies.stbp.usuario.Usuario;
import br.org.fies.stbp.usuario.UsuarioRepository;
import br.org.fies.stbp.usuario.UsuarioResponse;

@Service
class AuthService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final TokenService tokens;
    private final LimitadorTentativasLogin limitador;
    /** Comparado quando o usuário não existe, para o tempo de resposta não revelar quais logins existem. */
    private final String hashFicticio;

    AuthService(UsuarioRepository usuarios, PasswordEncoder encoder, TokenService tokens,
            LimitadorTentativasLogin limitador) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.tokens = tokens;
        this.limitador = limitador;
        this.hashFicticio = encoder.encode("senha-ficticia-para-tempo-constante");
    }

    @Transactional(readOnly = true)
    LoginResponse login(String identificador, String senha, String ip) {
        if (!limitador.permitir(identificador, ip)) {
            throw new MuitasTentativasException();
        }

        var usuario = usuarios.buscarPorLoginOuEmail(identificador.trim())
                .filter(u -> u.getStatus() != StatusUsuario.EXCLUIDO);
        boolean senhaConfere = encoder.matches(senha, usuario.map(Usuario::getSenhaHash).orElse(hashFicticio));

        if (usuario.isEmpty() || !senhaConfere) {
            throw new CredenciaisInvalidasException("Usuário ou senha inválidos");
        }
        if (usuario.get().getStatus() == StatusUsuario.BLOQUEADO) {
            throw new CredenciaisInvalidasException("A conta está bloqueada");
        }

        limitador.limpar(identificador, ip);
        var token = tokens.emitir(usuario.get());
        return new LoginResponse(token.token(), token.expiraEm(), UsuarioResponse.de(usuario.get()));
    }

    @Transactional
    void trocarSenha(Long usuarioId, String senhaAtual, String novaSenha) {
        var usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new NaoEncontradoException("Usuário não encontrado"));
        if (!encoder.matches(senhaAtual, usuario.getSenhaHash())) {
            throw new RegraNegocioException("A senha atual não confere");
        }
        if (senhaAtual.equals(novaSenha)) {
            throw new RegraNegocioException("A nova senha deve ser diferente da atual");
        }
        usuario.definirSenha(encoder.encode(novaSenha));
    }

    @Transactional(readOnly = true)
    UsuarioResponse buscar(Long usuarioId) {
        return usuarios.findById(usuarioId).map(UsuarioResponse::de)
                .orElseThrow(() -> new NaoEncontradoException("Usuário não encontrado"));
    }

    static class CredenciaisInvalidasException extends RuntimeException {
        CredenciaisInvalidasException(String mensagem) {
            super(mensagem);
        }
    }

    static class MuitasTentativasException extends RuntimeException {
    }
}
