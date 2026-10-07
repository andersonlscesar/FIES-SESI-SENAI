package br.org.fies.stbp.usuario;

import java.time.OffsetDateTime;

/** {@code emUso}: o usuário criou transferências; não pode ser excluído, só bloqueado. */
public record UsuarioResponse(Long id, String nome, String login, String email, Perfil perfil, StatusUsuario status,
        boolean trocarSenha, boolean emUso, OffsetDateTime criadoEm, OffsetDateTime atualizadoEm) {

    public static UsuarioResponse de(Usuario u) {
        return new UsuarioResponse(u.getId(), u.getNome(), u.getLogin(), u.getEmail(), u.getPerfil(), u.getStatus(),
                u.isTrocarSenha(), u.isEmUso(), u.getCriadoEm(), u.getAtualizadoEm());
    }
}
