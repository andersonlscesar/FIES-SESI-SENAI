package br.org.fies.stbp.transferencia;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import br.org.fies.stbp.cadastro.Unidade;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

final class TransferenciaDtos {

    private TransferenciaDtos() {
    }

    /** Usado na criação e na edição. Na edição, itens com {@code id} são atualizados, sem {@code id} são incluídos
     * e os ausentes são removidos. A ordem da lista define a numeração no termo. */
    record TransferenciaRequest(
            @NotNull(message = "Informe a data") LocalDate data,
            @NotNull(message = "Informe o motivo") Motivo motivo,
            @NotNull(message = "Informe a instituição") Long instituicaoId,
            @NotNull(message = "Informe a unidade de origem") Long origemId,
            @NotNull(message = "Informe a unidade de destino") Long destinoId,
            @NotBlank(message = "Informe o responsável pelo envio")
            @Size(max = 150, message = "Máximo de 150 caracteres") String responsavelEnvio,
            @NotBlank(message = "Informe o responsável pelo recebimento")
            @Size(max = 150, message = "Máximo de 150 caracteres") String responsavelRecebimento,
            @NotEmpty(message = "Informe ao menos um item")
            @Size(max = 500, message = "Máximo de 500 itens por transferência") List<@Valid ItemRequest> itens) {
    }

    record ItemRequest(
            Long id,
            @NotBlank(message = "Informe a descrição do item")
            @Size(max = 200, message = "Máximo de 200 caracteres") String descricao,
            @Size(max = 150, message = "Máximo de 150 caracteres") String patrimonio,
            @Size(max = 5000, message = "Máximo de 5000 caracteres") String observacao) {
    }

    /** Filtros da listagem (query string). */
    record FiltroTransferencia(
            String busca,
            Long instituicaoId,
            Long origemId,
            Long destinoId,
            Long criadoPorId,
            Motivo motivo,
            LocalDate dataInicial,
            LocalDate dataFinal,
            Boolean minhas) {
    }

    record Referencia(Long id, String nome) {
    }

    /** Unidade de origem/destino; {@code imagemUrl} é a foto da unidade (nulo se não houver). */
    record UnidadeReferencia(Long id, String nome, String imagemUrl) {

        static UnidadeReferencia de(Unidade u) {
            return new UnidadeReferencia(u.getId(), u.getNome(), u.getImagemUrl());
        }
    }

    record ItemResponse(Long id, int ordem, String descricao, String patrimonio, String observacao) {

        static ItemResponse de(Item i) {
            return new ItemResponse(i.getId(), i.getOrdem(), i.getDescricao(), i.getPatrimonio(), i.getObservacao());
        }
    }

    record TransferenciaResumo(Long id, LocalDate data, Motivo motivo, Referencia instituicao, UnidadeReferencia origem,
            UnidadeReferencia destino, String responsavelEnvio, String responsavelRecebimento, Referencia criadoPor,
            int quantidadeItens, OffsetDateTime criadoEm, OffsetDateTime excluidoEm) {

        static TransferenciaResumo de(Transferencia t) {
            return new TransferenciaResumo(t.getId(), t.getData(), t.getMotivo(),
                    new Referencia(t.getInstituicao().getId(), t.getInstituicao().getNome()),
                    UnidadeReferencia.de(t.getOrigem()),
                    UnidadeReferencia.de(t.getDestino()),
                    t.getResponsavelEnvio(), t.getResponsavelRecebimento(),
                    new Referencia(t.getCriadoPor().getId(), t.getCriadoPor().getNome()),
                    t.getQuantidadeItens(), t.getCriadoEm(), t.getExcluidoEm());
        }
    }

    /** {@code podeAlterar} indica se o usuário logado pode editar, excluir ou restaurar esta transferência. */
    record TransferenciaDetalhe(Long id, LocalDate data, Motivo motivo, Referencia instituicao, UnidadeReferencia origem,
            UnidadeReferencia destino, String responsavelEnvio, String responsavelRecebimento, Referencia criadoPor,
            List<ItemResponse> itens, OffsetDateTime criadoEm, OffsetDateTime atualizadoEm,
            OffsetDateTime excluidoEm, boolean podeAlterar) {

        static TransferenciaDetalhe de(Transferencia t, boolean podeAlterar) {
            return new TransferenciaDetalhe(t.getId(), t.getData(), t.getMotivo(),
                    new Referencia(t.getInstituicao().getId(), t.getInstituicao().getNome()),
                    UnidadeReferencia.de(t.getOrigem()),
                    UnidadeReferencia.de(t.getDestino()),
                    t.getResponsavelEnvio(), t.getResponsavelRecebimento(),
                    new Referencia(t.getCriadoPor().getId(), t.getCriadoPor().getNome()),
                    t.getItens().stream().map(ItemResponse::de).toList(),
                    t.getCriadoEm(), t.getAtualizadoEm(), t.getExcluidoEm(), podeAlterar);
        }
    }
}
