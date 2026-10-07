package br.org.fies.stbp.comum;

/** Usuário autenticado, mas sem permissão para esta ação sobre este recurso específico (HTTP 403). */
public class ProibidoException extends RuntimeException {

    public ProibidoException(String mensagem) {
        super(mensagem);
    }
}
