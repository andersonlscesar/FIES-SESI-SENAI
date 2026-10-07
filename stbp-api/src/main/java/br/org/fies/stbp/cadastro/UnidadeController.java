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

import br.org.fies.stbp.cadastro.CadastroDtos.UnidadeRequest;
import br.org.fies.stbp.cadastro.CadastroDtos.UnidadeResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/unidades")
class UnidadeController {

    private final CadastroService service;

    UnidadeController(CadastroService service) {
        this.service = service;
    }

    /** Com {@code instituicaoId}, retorna só as unidades daquela instituição (para filtrar o formulário). */
    @GetMapping
    List<UnidadeResponse> listar(@RequestParam(required = false) Long instituicaoId) {
        return service.listarUnidades(instituicaoId);
    }

    @GetMapping("/{id}")
    UnidadeResponse buscar(@PathVariable Long id) {
        return service.buscarUnidade(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    UnidadeResponse criar(@Valid @RequestBody UnidadeRequest pedido) {
        return service.criarUnidade(pedido);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    UnidadeResponse atualizar(@PathVariable Long id, @Valid @RequestBody UnidadeRequest pedido) {
        return service.atualizarUnidade(id, pedido);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void excluir(@PathVariable Long id) {
        service.excluirUnidade(id);
    }

    /** Bloqueia para novas transferências (alternativa à exclusão de unidades em uso). */
    @PostMapping("/{id}/bloquear")
    @PreAuthorize("hasRole('ADMIN')")
    UnidadeResponse bloquear(@PathVariable Long id) {
        return service.bloquearUnidade(id);
    }

    @PostMapping("/{id}/desbloquear")
    @PreAuthorize("hasRole('ADMIN')")
    UnidadeResponse desbloquear(@PathVariable Long id) {
        return service.desbloquearUnidade(id);
    }

    /** Público (sem token), para poder ser usado direto em {@code <img src>}. */
    @GetMapping("/{id}/imagem")
    ResponseEntity<byte[]> imagem(@PathVariable Long id) {
        var foto = service.buscarFotoUnidade(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(foto.tipo()))
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)))
                .body(foto.dados());
    }

    /** Multipart, campo {@code arquivo}: PNG ou JPEG de até 20 MB; gravada redimensionada (JPEG, até 1200 px). */
    @PutMapping(path = "/{id}/imagem", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void definirImagem(@PathVariable Long id, @RequestParam("arquivo") MultipartFile arquivo) {
        service.definirFotoUnidade(id, Imagem.fotoUnidade(arquivo));
    }

    @DeleteMapping("/{id}/imagem")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void removerImagem(@PathVariable Long id) {
        service.removerFotoUnidade(id);
    }
}
