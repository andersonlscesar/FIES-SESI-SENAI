package br.org.fies.stbp.seguranca;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Limita as tentativas de login por usuário + IP numa janela de 1 minuto (o sistema antigo usava 5/min).
 * Fica em memória: suficiente para uma instância; com várias instâncias, mover para um cache compartilhado.
 */
@Component
public class LimitadorTentativasLogin {

    private static final Duration JANELA = Duration.ofMinutes(1);

    private final Map<String, Deque<Instant>> tentativas = new ConcurrentHashMap<>();
    private final int limite;
    private final Clock relogio;

    LimitadorTentativasLogin(SegurancaProperties propriedades, Clock relogio) {
        this.limite = propriedades.loginTentativasPorMinuto();
        this.relogio = relogio;
    }

    /** Registra uma tentativa e informa se ela está dentro do limite. */
    public boolean permitir(String identificador, String ip) {
        Instant agora = relogio.instant();
        String chave = identificador.toLowerCase() + "|" + ip;
        Deque<Instant> registro = tentativas.computeIfAbsent(chave, k -> new ArrayDeque<>());
        synchronized (registro) {
            while (!registro.isEmpty() && registro.peekFirst().isBefore(agora.minus(JANELA))) {
                registro.pollFirst();
            }
            if (registro.size() >= limite) {
                return false;
            }
            registro.addLast(agora);
            return true;
        }
    }

    public void limpar(String identificador, String ip) {
        tentativas.remove(identificador.toLowerCase() + "|" + ip);
    }
}
