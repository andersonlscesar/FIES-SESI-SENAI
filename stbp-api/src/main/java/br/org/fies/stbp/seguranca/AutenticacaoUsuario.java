package br.org.fies.stbp.seguranca;

import java.util.Collection;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;

class AutenticacaoUsuario extends AbstractAuthenticationToken {

    private final UsuarioAutenticado usuario;

    AutenticacaoUsuario(UsuarioAutenticado usuario, Collection<? extends GrantedAuthority> autoridades) {
        super(autoridades);
        this.usuario = usuario;
        setAuthenticated(true);
    }

    @Override
    public UsuarioAutenticado getPrincipal() {
        return usuario;
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public String getName() {
        return usuario.login();
    }
}
