package br.org.fies.stbp.usuario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface UsuarioRepository extends JpaRepository<Usuario, Long>, JpaSpecificationExecutor<Usuario> {

    /** Login aceita tanto o login quanto o e-mail, sem diferenciar maiúsculas. */
    @Query("select u from Usuario u where lower(u.login) = lower(:identificador) or lower(u.email) = lower(:identificador)")
    Optional<Usuario> buscarPorLoginOuEmail(String identificador);

    Optional<Usuario> findByLoginIgnoreCase(String login);

    Optional<Usuario> findByEmailIgnoreCase(String email);
}
