package br.org.fies.stbp.comum;

/** Violação de unicidade ou de estado (ex.: login já em uso). */
public class ConflitoException extends RuntimeException {

    public ConflitoException(String mensagem) {
        super(mensagem);
    }
}
