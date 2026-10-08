package br.org.fies.stbp.transferencia;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Map;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.multipdf.LayerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.util.Matrix;
import org.springframework.stereotype.Component;

import br.org.fies.stbp.comum.GeradorPdf;

/**
 * Gera o Termo de Transferência em PDF. O retrato é renderizado a partir de resources/pdf/termo.xhtml; a paisagem
 * coloca duas vias do retrato, reduzidas, lado a lado numa A4 deitada (como no sistema antigo), sem template próprio.
 */
@Component
public class TermoPdf {

    public enum Formato {
        RETRATO,
        PAISAGEM
    }

    private final GeradorPdf gerador;

    TermoPdf(GeradorPdf gerador) {
        this.gerador = gerador;
    }

    public byte[] gerar(TermoDados termo, Formato formato) {
        byte[] retrato = gerador.renderizar("termo", Map.of("termo", termo));
        return formato == Formato.RETRATO ? retrato : duasViasEmPaisagem(retrato);
    }

    /** Cada página A4 retrato vira uma A4 paisagem com duas cópias reduzidas (escala A4 → A5) lado a lado. */
    private static byte[] duasViasEmPaisagem(byte[] retrato) {
        try (PDDocument origem = Loader.loadPDF(retrato); PDDocument destino = new PDDocument()) {
            var a4 = PDRectangle.A4;
            var paisagem = new PDRectangle(a4.getHeight(), a4.getWidth());
            float escala = paisagem.getHeight() / a4.getHeight();
            float larguraVia = a4.getWidth() * escala;
            float margemLateral = (paisagem.getWidth() - 2 * larguraVia) / 2;
            var camadas = new LayerUtility(destino);

            for (int i = 0; i < origem.getNumberOfPages(); i++) {
                var pagina = new PDPage(paisagem);
                destino.addPage(pagina);
                var via = camadas.importPageAsForm(origem, i);
                try (var conteudo = new PDPageContentStream(destino, pagina)) {
                    for (int copia = 0; copia < 2; copia++) {
                        conteudo.saveGraphicsState();
                        conteudo.transform(Matrix.getTranslateInstance(margemLateral + copia * larguraVia, 0));
                        conteudo.transform(Matrix.getScaleInstance(escala, escala));
                        conteudo.drawForm(via);
                        conteudo.restoreGraphicsState();
                    }
                }
            }
            var saida = new ByteArrayOutputStream();
            destino.save(saida);
            return saida.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao montar o termo em paisagem", e);
        }
    }
}
