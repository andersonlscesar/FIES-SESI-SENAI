package br.org.fies.stbp.seguranca;

import java.util.ArrayList;
import java.util.List;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import br.org.fies.stbp.usuario.UsuarioRepository;

/**
 * Transforma o JWT validado no usuário da requisição. O usuário é recarregado do banco a cada requisição para que
 * bloqueio, exclusão, troca de perfil e troca de senha pendente tenham efeito imediato, mesmo com token emitido antes.
 */
@Component
class ConversorTokenUsuario implements Converter<Jwt, AbstractAuthenticationToken> {

    /** Concedida apenas a quem não tem troca de senha pendente; exigida em quase todos os endpoints. */
    static final String SENHA_EM_DIA = "SENHA_EM_DIA";

    private final UsuarioRepository usuarios;

    ConversorTokenUsuario(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        var usuario = usuarios.findById(Long.valueOf(jwt.getSubject()))
                .filter(u -> u.isAtivo())
                .map(UsuarioAutenticado::de)
                .orElseThrow(() -> new DisabledException("Usuário inexistente, bloqueado ou excluído"));

        List<GrantedAuthority> autoridades = new ArrayList<>();
        autoridades.add(new SimpleGrantedAuthority("ROLE_" + usuario.perfil().name()));
        if (!usuario.trocarSenha()) {
            autoridades.add(new SimpleGrantedAuthority(SENHA_EM_DIA));
        }
        return new AutenticacaoUsuario(usuario, autoridades);
    }
}
