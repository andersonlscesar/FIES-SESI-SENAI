package br.org.fies.stbp.comum;

import java.util.regex.Pattern;

/** Normalizações de texto aplicadas antes de gravar (equivalentes às do sistema antigo). */
public final class Texto {

    private static final Pattern ESPACOS = Pattern.compile("\\s+");
    private static final Pattern NAO_ALFANUMERICO = Pattern.compile("[^A-Za-z0-9]");

    private Texto() {
    }

    /** Remove espaços extras e põe maiúscula na primeira letra de cada palavra, sem alterar as demais (ucwords). */
    public static String capitalizarPalavras(String texto) {
        String limpo = ESPACOS.matcher(texto.trim()).replaceAll(" ");
        var sb = new StringBuilder(limpo.length());
        boolean inicioPalavra = true;
        for (char c : limpo.toCharArray()) {
            sb.append(inicioPalavra ? Character.toUpperCase(c) : c);
            inicioPalavra = c == ' ';
        }
        return sb.toString();
    }

    /** Remove espaços nas pontas e põe maiúscula na primeira letra (ucfirst). */
    public static String primeiraMaiuscula(String texto) {
        String limpo = texto.trim();
        return limpo.isEmpty() ? limpo : Character.toUpperCase(limpo.charAt(0)) + limpo.substring(1);
    }

    /** "s/p", "S/P", "sp", vazio... viram {@code null} (sem patrimônio); a mesma regra da migração. */
    public static String patrimonio(String texto) {
        if (texto == null) {
            return null;
        }
        String limpo = texto.trim();
        String soAlfanumerico = NAO_ALFANUMERICO.matcher(limpo).replaceAll("").toUpperCase();
        return soAlfanumerico.isEmpty() || soAlfanumerico.equals("SP") ? null : limpo;
    }

    /** Texto livre opcional: vazio vira {@code null} e quebras de linha são padronizadas em "\n". */
    public static String opcional(String texto) {
        if (texto == null) {
            return null;
        }
        String limpo = texto.replace("\r\n", "\n").trim();
        return limpo.isEmpty() ? null : limpo;
    }
}
