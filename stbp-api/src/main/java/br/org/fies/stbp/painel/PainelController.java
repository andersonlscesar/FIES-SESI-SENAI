package br.org.fies.stbp.painel;

import java.time.LocalDate;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.org.fies.stbp.painel.PainelDtos.Painel;

/** Painel de análise geral; disponível a todos os perfis (somente leitura). */
@RestController
class PainelController {

    private final PainelService service;

    PainelController(PainelService service) {
        this.service = service;
    }

    @GetMapping("/api/painel")
    Painel painel(@RequestParam(required = false) LocalDate dataInicial,
            @RequestParam(required = false) LocalDate dataFinal,
            @RequestParam(required = false) Long instituicaoId) {
        return service.gerar(dataInicial, dataFinal, instituicaoId);
    }
}
