package br.org.fies.stbp.cadastro;

import java.time.Duration;
import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
import org.springframework.web.multipart.MultipartFile;

import br.org.fies.stbp.cadastro.CadastroDtos.InstituicaoRequest;
import br.org.fies.stbp.cadastro.CadastroDtos.InstituicaoResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/instituicoes")
class InstituicaoController {

    private final CadastroService service;

    InstituicaoController(CadastroService service) {
        this.service = service;
    }

    @GetMapping
    List<InstituicaoResponse> listar() {
        return service.listarInstituicoes();
    }

    @GetMapping("/{id}")
    InstituicaoResponse buscar(@PathVariable Long id) {
        return service.buscarInstituicao(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    InstituicaoResponse criar(@Valid @RequestBody InstituicaoRequest pedido) {
        return service.criarInstituicao(pedido.nome());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    InstituicaoResponse renomear(@PathVariable Long id, @Valid @RequestBody InstituicaoRequest pedido) {
        return service.renomearInstituicao(id, pedido.nome());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void excluir(@PathVariable Long id) {
        service.excluirInstituicao(id);
    }

    /** Bloqueia para novas transferências (alternativa à exclusão de instituições em uso). */
    @PostMapping("/{id}/bloquear")
    @PreAuthorize("hasRole('ADMIN')")
    InstituicaoResponse bloquear(@PathVariable Long id) {
        return service.bloquearInstituicao(id);
    }

    @PostMapping("/{id}/desbloquear")
    @PreAuthorize("hasRole('ADMIN')")
    InstituicaoResponse desbloquear(@PathVariable Long id) {
        return service.desbloquearInstituicao(id);
    }

    /** Público (sem token), para poder ser usado direto em {@code <img src>}. */
    @GetMapping("/{id}/logo")
    ResponseEntity<byte[]> logo(@PathVariable Long id) {
        var logo = service.buscarLogo(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(logo.tipo()))
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)))
                .body(logo.dados());
    }

    /** Multipart, campo {@code arquivo}: PNG ou JPEG de até 1 MB. Substitui a logo atual. */
    @PutMapping(path = "/{id}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void definirLogo(@PathVariable Long id, @RequestParam("arquivo") MultipartFile arquivo) {
        service.definirLogo(id, Imagem.logo(arquivo));
    }

    @DeleteMapping("/{id}/logo")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void removerLogo(@PathVariable Long id) {
        service.removerLogo(id);
    }
}
