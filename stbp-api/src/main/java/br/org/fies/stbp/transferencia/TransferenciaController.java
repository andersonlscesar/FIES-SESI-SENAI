package br.org.fies.stbp.transferencia;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
import br.org.fies.stbp.transferencia.TransferenciaDtos.FiltroTransferencia;
import br.org.fies.stbp.transferencia.TransferenciaDtos.Referencia;
import br.org.fies.stbp.transferencia.TransferenciaDtos.TransferenciaDetalhe;
import br.org.fies.stbp.transferencia.TransferenciaDtos.TransferenciaRequest;
import br.org.fies.stbp.transferencia.TransferenciaDtos.TransferenciaResumo;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/transferencias")
class TransferenciaController {

    private final TransferenciaService service;
    private final TermoPdf termoPdf;

    TransferenciaController(TransferenciaService service, TermoPdf termoPdf) {
        this.service = service;
        this.termoPdf = termoPdf;
    }

    @GetMapping
    PaginaResponse<TransferenciaResumo> listar(FiltroTransferencia filtro,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pagina,
            @AuthenticationPrincipal UsuarioAutenticado eu) {
        return PaginaResponse.de(service.listar(filtro, pagina, eu));
    }

    @GetMapping("/autores")
    List<Referencia> autores() {
        return service.autores();
    }

    @GetMapping("/lixeira")
    @PreAuthorize("hasRole('TECNICO')")
    PaginaResponse<TransferenciaResumo> lixeira(
            @PageableDefault(size = 20, sort = "excluidoEm", direction = Sort.Direction.DESC) Pageable pagina,
            @AuthenticationPrincipal UsuarioAutenticado eu) {
        return PaginaResponse.de(service.lixeira(pagina, eu));
    }

    @GetMapping("/{id}")
    TransferenciaDetalhe detalhar(@PathVariable Long id, @AuthenticationPrincipal UsuarioAutenticado eu) {
        return service.detalhar(id, eu);
    }

    /**
     * Termo de Transferência em PDF. {@code formato=paisagem} gera duas vias por folha; {@code download=true} força o
     * download em vez de abrir no navegador.
     */
    @GetMapping(path = "/{id}/termo", produces = MediaType.APPLICATION_PDF_VALUE)
    ResponseEntity<byte[]> termo(@PathVariable Long id,
            @RequestParam(defaultValue = "RETRATO") TermoPdf.Formato formato,
            @RequestParam(defaultValue = "false") boolean download,
            @AuthenticationPrincipal UsuarioAutenticado eu) {
        var dados = service.dadosDoTermo(id, eu);
        byte[] pdf = termoPdf.gerar(dados, formato);
        var disposicao = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(dados.titulo() + ".pdf", StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposicao.toString())
                .body(pdf);
    }

    @PostMapping
    @PreAuthorize("hasRole('TECNICO')")
    @ResponseStatus(HttpStatus.CREATED)
    TransferenciaDetalhe criar(@Valid @RequestBody TransferenciaRequest pedido,
            @AuthenticationPrincipal UsuarioAutenticado eu) {
        return service.criar(pedido, eu);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TECNICO')")
    TransferenciaDetalhe atualizar(@PathVariable Long id, @Valid @RequestBody TransferenciaRequest pedido,
            @AuthenticationPrincipal UsuarioAutenticado eu) {
        return service.atualizar(id, pedido, eu);
    }

    /** Move para a lixeira (pode ser restaurada). */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TECNICO')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void moverParaLixeira(@PathVariable Long id, @AuthenticationPrincipal UsuarioAutenticado eu) {
        service.moverParaLixeira(id, eu);
    }

    @PostMapping("/{id}/restaurar")
    @PreAuthorize("hasRole('TECNICO')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void restaurar(@PathVariable Long id, @AuthenticationPrincipal UsuarioAutenticado eu) {
        service.restaurar(id, eu);
    }

    @DeleteMapping("/{id}/definitivo")
    @PreAuthorize("hasRole('TECNICO')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void excluirDefinitivamente(@PathVariable Long id, @AuthenticationPrincipal UsuarioAutenticado eu) {
        service.excluirDefinitivamente(id, eu);
    }
}
