package br.org.fies.stbp.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.org.fies.stbp.auth.AuthDtos.LoginRequest;
import br.org.fies.stbp.auth.AuthDtos.LoginResponse;
import br.org.fies.stbp.auth.AuthDtos.TrocaSenhaRequest;
import br.org.fies.stbp.auth.AuthService.CredenciaisInvalidasException;
import br.org.fies.stbp.auth.AuthService.MuitasTentativasException;
import br.org.fies.stbp.seguranca.UsuarioAutenticado;
import br.org.fies.stbp.usuario.UsuarioResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
class AuthController {

    private final AuthService service;

    AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/login")
    LoginResponse login(@Valid @RequestBody LoginRequest pedido, HttpServletRequest request) {
        return service.login(pedido.usuario(), pedido.senha(), request.getRemoteAddr());
    }

    @GetMapping("/eu")
    UsuarioResponse eu(@AuthenticationPrincipal UsuarioAutenticado eu) {
        return service.buscar(eu.id());
    }

    @PutMapping("/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void trocarSenha(@AuthenticationPrincipal UsuarioAutenticado eu, @Valid @RequestBody TrocaSenhaRequest pedido) {
        service.trocarSenha(eu.id(), pedido.senhaAtual(), pedido.novaSenha());
    }

    @ExceptionHandler(CredenciaisInvalidasException.class)
    ProblemDetail credenciaisInvalidas(CredenciaisInvalidasException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage());
    }

    @ExceptionHandler(MuitasTentativasException.class)
    ProblemDetail muitasTentativas() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS,
                "Muitas tentativas de login. Aguarde um minuto e tente novamente");
    }
}
