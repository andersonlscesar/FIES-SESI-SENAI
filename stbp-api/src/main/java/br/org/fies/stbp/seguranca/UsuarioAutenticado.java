package br.org.fies.stbp.seguranca;

import br.org.fies.stbp.usuario.Perfil;
import br.org.fies.stbp.usuario.Usuario;

/** Usuário da requisição atual; obtido nos controllers com {@code @AuthenticationPrincipal}. */
public record UsuarioAutenticado(Long id, String login, Perfil perfil, boolean trocarSenha) {

    static UsuarioAutenticado de(Usuario usuario) {
        return new UsuarioAutenticado(usuario.getId(), usuario.getLogin(), usuario.getPerfil(),
                usuario.isTrocarSenha());
    }

    public boolean incluiPerfil(Perfil perfil) {
        return this.perfil.incluiPerfil(perfil);
    }
}
