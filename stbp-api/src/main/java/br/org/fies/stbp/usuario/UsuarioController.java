package br.org.fies.stbp.usuario;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.org.fies.stbp.comum.PaginaResponse;
import br.org.fies.stbp.seguranca.UsuarioAutenticado;
import br.org.fies.stbp.usuario.UsuarioDtos.AtualizarUsuarioRequest;
import br.org.fies.stbp.usuario.UsuarioDtos.CriarUsuarioRequest;
import br.org.fies.stbp.usuario.UsuarioDtos.RedefinirSenhaRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/usuarios")
@PreAuthorize("hasRole('ADMIN')")
class UsuarioController {

    private final UsuarioService service;

    UsuarioController(UsuarioService service) {
        this.service = service;
    }

    @GetMapping
    PaginaResponse<UsuarioResponse> listar(
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) Perfil perfil,
            @RequestParam(required = false) StatusUsuario status,
            @PageableDefault(size = 20, sort = "nome", direction = Sort.Direction.ASC) Pageable pagina) {
        return PaginaResponse.de(service.listar(busca, perfil, status, pagina));
    }

    @GetMapping("/{id}")
    UsuarioResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    UsuarioResponse criar(@Valid @RequestBody CriarUsuarioRequest pedido,
            @AuthenticationPrincipal UsuarioAutenticado eu) {
        return service.criar(pedido, eu);
    }

    @PutMapping("/{id}")
    UsuarioResponse atualizar(@PathVariable Long id, @Valid @RequestBody AtualizarUsuarioRequest pedido,
            @AuthenticationPrincipal UsuarioAutenticado eu) {
        return service.atualizar(id, pedido, eu);
    }

    @PutMapping("/{id}/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void redefinirSenha(@PathVariable Long id, @Valid @RequestBody RedefinirSenhaRequest pedido,
            @AuthenticationPrincipal UsuarioAutenticado eu) {
        service.redefinirSenha(id, pedido.novaSenha(), eu);
    }

    @PostMapping("/{id}/bloquear")
    UsuarioResponse bloquear(@PathVariable Long id, @AuthenticationPrincipal UsuarioAutenticado eu) {
        return service.bloquear(id, eu);
    }

    @PostMapping("/{id}/desbloquear")
    UsuarioResponse desbloquear(@PathVariable Long id, @AuthenticationPrincipal UsuarioAutenticado eu) {
        return service.desbloquear(id, eu);
    }

    /** Exclusão lógica: o usuário vai para a lixeira (status EXCLUIDO) e pode ser restaurado. */
    @DeleteMapping("/{id}")
    UsuarioResponse excluir(@PathVariable Long id, @AuthenticationPrincipal UsuarioAutenticado eu) {
        return service.excluir(id, eu);
    }

    @PostMapping("/{id}/restaurar")
    UsuarioResponse restaurar(@PathVariable Long id, @AuthenticationPrincipal UsuarioAutenticado eu) {
        return service.restaurar(id, eu);
    }
}
