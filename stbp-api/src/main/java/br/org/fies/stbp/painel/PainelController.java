package br.org.fies.stbp.painel;

import java.time.LocalDate;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.org.fies.stbp.painel.PainelDtos.Painel;
import br.org.fies.stbp.painel.PainelSaidasDtos.PainelSaidas;

/** Painel de análise geral; disponível a todos os perfis (somente leitura). */
@RestController
class PainelController {

    private final PainelService service;
    private final PainelSaidasService saidas;

    PainelController(PainelService service, PainelSaidasService saidas) {
        this.service = service;
        this.saidas = saidas;
    }

    @GetMapping("/api/painel")
    Painel painel(@RequestParam(required = false) LocalDate dataInicial,
            @RequestParam(required = false) LocalDate dataFinal,
            @RequestParam(required = false) Long instituicaoId) {
        return service.gerar(dataInicial, dataFinal, instituicaoId);
    }

    /** Mesmo recorte do painel de transferências, para o Controle de Saída de Materiais. */
    @GetMapping("/api/painel/saidas")
    PainelSaidas painelSaidas(@RequestParam(required = false) LocalDate dataInicial,
            @RequestParam(required = false) LocalDate dataFinal,
            @RequestParam(required = false) Long instituicaoId) {
        return saidas.gerar(dataInicial, dataFinal, instituicaoId);
    }
}
