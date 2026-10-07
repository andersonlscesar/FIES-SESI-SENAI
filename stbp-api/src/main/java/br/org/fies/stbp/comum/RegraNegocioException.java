package br.org.fies.stbp.comum;

/** Pedido válido no formato, mas que viola uma regra de negócio (ex.: bloquear a si mesmo). */
public class RegraNegocioException extends RuntimeException {

    public RegraNegocioException(String mensagem) {
        super(mensagem);
    }
}
