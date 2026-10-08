package br.org.fies.stbp.saida;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

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

import br.org.fies.stbp.comum.GeradorPdf;
import br.org.fies.stbp.comum.PaginaResponse;
import br.org.fies.stbp.saida.SaidaDtos.FiltroSaida;
import br.org.fies.stbp.saida.SaidaDtos.Referencia;
import br.org.fies.stbp.saida.SaidaDtos.SaidaDetalhe;
import br.org.fies.stbp.saida.SaidaDtos.SaidaRequest;
import br.org.fies.stbp.saida.SaidaDtos.SaidaResumo;
import br.org.fies.stbp.seguranca.UsuarioAutenticado;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/saidas")
class SaidaController {

    private final SaidaService service;
    private final GeradorPdf pdf;

    SaidaController(SaidaService service, GeradorPdf pdf) {
        this.service = service;
        this.pdf = pdf;
    }

    @GetMapping
    PaginaResponse<SaidaResumo> listar(FiltroSaida filtro,
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
    PaginaResponse<SaidaResumo> lixeira(
            @PageableDefault(size = 20, sort = "excluidoEm", direction = Sort.Direction.DESC) Pageable pagina,
            @AuthenticationPrincipal UsuarioAutenticado eu) {
        return PaginaResponse.de(service.lixeira(pagina, eu));
    }

    @GetMapping("/{id}")
    SaidaDetalhe detalhar(@PathVariable Long id, @AuthenticationPrincipal UsuarioAutenticado eu) {
        return service.detalhar(id, eu);
    }

    /** Formulário FM-072-UOP-04 em PDF (A4 paisagem); {@code download=true} força o download. */
    @GetMapping(path = "/{id}/formulario", produces = MediaType.APPLICATION_PDF_VALUE)
    ResponseEntity<byte[]> formulario(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean download,
            @AuthenticationPrincipal UsuarioAutenticado eu) {
        var dados = service.dadosDoFormulario(id, eu);
        byte[] conteudo = pdf.renderizar("controle-saida", Map.of("saida", dados));
        var disposicao = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(dados.titulo() + ".pdf", StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposicao.toString())
                .body(conteudo);
    }

    @PostMapping
    @PreAuthorize("hasRole('TECNICO')")
    @ResponseStatus(HttpStatus.CREATED)
    SaidaDetalhe criar(@Valid @RequestBody SaidaRequest pedido, @AuthenticationPrincipal UsuarioAutenticado eu) {
        return service.criar(pedido, eu);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TECNICO')")
    SaidaDetalhe atualizar(@PathVariable Long id, @Valid @RequestBody SaidaRequest pedido,
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
