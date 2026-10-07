package br.org.fies.stbp.auth;

import java.time.Instant;

import br.org.fies.stbp.usuario.UsuarioResponse;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

final class AuthDtos {

    private AuthDtos() {
    }

    /** {@code usuario} aceita o login ou o e-mail. */
    record LoginRequest(
            @NotBlank(message = "Informe o usuário ou e-mail") String usuario,
            @NotBlank(message = "Informe a senha") String senha) {
    }

    record LoginResponse(String token, Instant expiraEm, UsuarioResponse usuario) {
    }

    record TrocaSenhaRequest(
            @NotBlank(message = "Informe a senha atual") String senhaAtual,
            @NotBlank(message = "Informe a nova senha")
            @Size(min = 8, max = 72, message = "A nova senha deve ter entre 8 e 72 caracteres") String novaSenha) {
    }
}
