package br.org.fies.stbp.cadastro;

import java.util.List;
import java.util.Set;

import br.org.fies.stbp.transferencia.Motivo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

final class CadastroDtos {

    private CadastroDtos() {
    }

    record InstituicaoRequest(
            @NotBlank(message = "Informe o nome") @Size(max = 50, message = "Máximo de 50 caracteres") String nome) {
    }

    /**
     * {@code logoUrl} é nulo quando a instituição não tem logo. {@code ativa = false}: bloqueada para novas
     * transferências. {@code emUso}: já usada em transferências (não pode ser excluída, só bloqueada).
     */
    record InstituicaoResponse(Long id, String nome, String logoUrl, boolean ativa, boolean emUso) {

        static InstituicaoResponse de(Instituicao i) {
            return new InstituicaoResponse(i.getId(), i.getNome(),
                    i.isTemLogo() ? "/api/instituicoes/" + i.getId() + "/logo" : null, i.isAtiva(), i.isEmUso());
        }
    }

    record UnidadeRequest(
            @NotBlank(message = "Informe o nome") @Size(max = 100, message = "Máximo de 100 caracteres") String nome,
            @NotEmpty(message = "Informe ao menos uma instituição") Set<Long> instituicaoIds) {
    }

    /**
     * {@code imagemUrl} é nulo quando a unidade não tem foto. {@code ativa = false}: bloqueada para novas
     * transferências. {@code emUso}: já é origem ou destino de transferências (não pode ser excluída, só bloqueada).
     */
    record UnidadeResponse(Long id, String nome, String imagemUrl, boolean ativa, boolean emUso,
            List<Long> instituicaoIds) {

        static UnidadeResponse de(Unidade u) {
            return new UnidadeResponse(u.getId(), u.getNome(), u.getImagemUrl(), u.isAtiva(), u.isEmUso(),
                    u.getInstituicoes().stream().map(Instituicao::getId).sorted().toList());
        }
    }

    record MotivoResponse(Motivo codigo, String descricao, Motivo.Tipo tipo) {
    }
}
