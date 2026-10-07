package br.org.fies.stbp.cadastro;

import java.util.Arrays;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import br.org.fies.stbp.cadastro.CadastroDtos.MotivoResponse;
import br.org.fies.stbp.transferencia.Motivo;

/** Motivos são fixos (enum): definem os quadros do termo impresso. */
@RestController
class MotivoController {

    @GetMapping("/api/motivos")
    List<MotivoResponse> listar() {
        return Arrays.stream(Motivo.values())
                .map(m -> new MotivoResponse(m, m.getDescricao(), m.getTipo()))
                .toList();
    }
}
