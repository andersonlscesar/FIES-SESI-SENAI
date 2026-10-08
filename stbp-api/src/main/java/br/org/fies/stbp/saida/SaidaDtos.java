package br.org.fies.stbp.saida;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import br.org.fies.stbp.cadastro.Unidade;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

final class SaidaDtos {

    private SaidaDtos() {
    }

    /**
     * Criação e edição. O destino é {@code destinoId} (unidade) <b>ou</b> {@code destinoExterno} (texto), nunca os
     * dois. Itens com {@code id} são atualizados, sem {@code id} são incluídos e os ausentes são removidos.
     */
    record SaidaRequest(
            @NotNull(message = "Informe a data") LocalDate data,
            @NotNull(message = "Informe o tipo de saída") TipoSaida tipo,
            @Size(max = 150, message = "Máximo de 150 caracteres") String tipoOutro,
            @NotNull(message = "Informe a instituição") Long instituicaoId,
            @NotNull(message = "Informe a unidade de origem") Long origemId,
            Long destinoId,
            @Size(max = 200, message = "Máximo de 200 caracteres") String destinoExterno,
            @Size(max = 150, message = "Máximo de 150 caracteres") String portador,
            @NotEmpty(message = "Informe ao menos um item")
            @Size(max = 500, message = "Máximo de 500 itens por saída") List<@Valid ItemSaidaRequest> itens) {
    }

    record ItemSaidaRequest(
            Long id,
            @NotBlank(message = "Informe a descrição do item")
            @Size(max = 200, message = "Máximo de 200 caracteres") String descricao,
            @Size(max = 150, message = "Máximo de 150 caracteres") String areaSaida,
            @Size(max = 150, message = "Máximo de 150 caracteres") String areaEntrada,
            @Size(max = 5000, message = "Máximo de 5000 caracteres") String observacao) {
    }

    /** Filtros da listagem (query string). */
    record FiltroSaida(
            String busca,
            Long instituicaoId,
            Long origemId,
            Long destinoId,
            Long criadoPorId,
            TipoSaida tipo,
            LocalDate dataInicial,
            LocalDate dataFinal,
            Boolean minhas) {
    }

    record Referencia(Long id, String nome) {
    }

    /** Unidade com a foto (nula se não houver). */
    record UnidadeReferencia(Long id, String nome, String imagemUrl) {

        static UnidadeReferencia de(Unidade u) {
            return u == null ? null : new UnidadeReferencia(u.getId(), u.getNome(), u.getImagemUrl());
        }
    }

    record ItemSaidaResponse(Long id, int ordem, String descricao, String areaSaida, String areaEntrada,
            String observacao) {

        static ItemSaidaResponse de(ItemSaida i) {
            return new ItemSaidaResponse(i.getId(), i.getOrdem(), i.getDescricao(), i.getAreaSaida(), i.getAreaEntrada(),
                    i.getObservacao());
        }
    }

    /** {@code destino} é nulo quando o destino é externo; {@code nomeDestino} vale para os dois casos. */
    record SaidaResumo(Long id, LocalDate data, TipoSaida tipo, String tipoOutro, Referencia instituicao,
            UnidadeReferencia origem, UnidadeReferencia destino, String destinoExterno, String nomeDestino,
            String portador, Referencia criadoPor, int quantidadeItens, OffsetDateTime criadoEm,
            OffsetDateTime excluidoEm) {

        static SaidaResumo de(SaidaMaterial s) {
            return new SaidaResumo(s.getId(), s.getData(), s.getTipo(), s.getTipoOutro(),
                    new Referencia(s.getInstituicao().getId(), s.getInstituicao().getNome()),
                    UnidadeReferencia.de(s.getOrigem()), UnidadeReferencia.de(s.getDestino()), s.getDestinoExterno(),
                    s.getNomeDestino(), s.getPortador(),
                    new Referencia(s.getCriadoPor().getId(), s.getCriadoPor().getNome()),
                    s.getQuantidadeItens(), s.getCriadoEm(), s.getExcluidoEm());
        }
    }

    /** {@code podeAlterar} indica se o usuário logado pode editar, excluir ou restaurar esta saída. */
    record SaidaDetalhe(Long id, LocalDate data, TipoSaida tipo, String tipoOutro, Referencia instituicao,
            UnidadeReferencia origem, UnidadeReferencia destino, String destinoExterno, String nomeDestino,
            String portador, Referencia criadoPor, List<ItemSaidaResponse> itens, OffsetDateTime criadoEm,
            OffsetDateTime atualizadoEm, OffsetDateTime excluidoEm, boolean podeAlterar) {

        static SaidaDetalhe de(SaidaMaterial s, boolean podeAlterar) {
            return new SaidaDetalhe(s.getId(), s.getData(), s.getTipo(), s.getTipoOutro(),
                    new Referencia(s.getInstituicao().getId(), s.getInstituicao().getNome()),
                    UnidadeReferencia.de(s.getOrigem()), UnidadeReferencia.de(s.getDestino()), s.getDestinoExterno(),
                    s.getNomeDestino(), s.getPortador(),
                    new Referencia(s.getCriadoPor().getId(), s.getCriadoPor().getNome()),
                    s.getItens().stream().map(ItemSaidaResponse::de).toList(),
                    s.getCriadoEm(), s.getAtualizadoEm(), s.getExcluidoEm(), podeAlterar);
        }
    }
}
