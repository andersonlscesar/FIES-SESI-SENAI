package br.org.fies.stbp.usuario;

/**
 * Níveis de acesso, do menor para o maior. Cada perfil inclui as permissões dos anteriores.
 */
public enum Perfil {
    LEITOR,
    TECNICO,
    ADMIN,
    SUPERADMIN;

    public boolean incluiPerfil(Perfil outro) {
        return ordinal() >= outro.ordinal();
    }
}
