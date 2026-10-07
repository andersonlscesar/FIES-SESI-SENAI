package br.org.fies.stbp.usuario;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

final class UsuarioDtos {

    private UsuarioDtos() {
    }

    record CriarUsuarioRequest(
            @NotBlank(message = "Informe o nome") @Size(max = 150, message = "Máximo de 150 caracteres") String nome,
            @NotBlank(message = "Informe o login") @Size(max = 100, message = "Máximo de 100 caracteres")
            @Pattern(regexp = "^[A-Za-z0-9._-]+$", message = "Use apenas letras, números, ponto, hífen ou sublinhado")
            String login,
            @NotBlank(message = "Informe o e-mail") @Email(message = "E-mail inválido")
            @Size(max = 150, message = "Máximo de 150 caracteres") String email,
            @NotBlank(message = "Informe a senha")
            @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres") String senha,
            @NotNull(message = "Informe o perfil") Perfil perfil) {
    }

    record AtualizarUsuarioRequest(
            @NotBlank(message = "Informe o nome") @Size(max = 150, message = "Máximo de 150 caracteres") String nome,
            @NotBlank(message = "Informe o login") @Size(max = 100, message = "Máximo de 100 caracteres")
            @Pattern(regexp = "^[A-Za-z0-9._-]+$", message = "Use apenas letras, números, ponto, hífen ou sublinhado")
            String login,
            @NotBlank(message = "Informe o e-mail") @Email(message = "E-mail inválido")
            @Size(max = 150, message = "Máximo de 150 caracteres") String email,
            @NotNull(message = "Informe o perfil") Perfil perfil) {
    }

    record RedefinirSenhaRequest(
            @NotBlank(message = "Informe a nova senha")
            @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres") String novaSenha) {
    }
}
