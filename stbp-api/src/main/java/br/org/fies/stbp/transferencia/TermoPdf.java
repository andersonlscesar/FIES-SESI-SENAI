package br.org.fies.stbp.transferencia;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.multipdf.LayerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.util.Matrix;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

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

    private static final String FONTE = "Carlito";

    private final TemplateEngine templates;

    TermoPdf() {
        var resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("pdf/");
        resolver.setSuffix(".xhtml");
        resolver.setTemplateMode(TemplateMode.XML);
        resolver.setCharacterEncoding("UTF-8");
        this.templates = new TemplateEngine();
        this.templates.setTemplateResolver(resolver);
    }

    public byte[] gerar(TermoDados termo, Formato formato) {
        byte[] retrato = renderizarRetrato(termo);
        return formato == Formato.RETRATO ? retrato : duasViasEmPaisagem(retrato);
    }

    private byte[] renderizarRetrato(TermoDados termo) {
        var contexto = new Context();
        contexto.setVariable("termo", termo);
        String html = templates.process("termo", contexto);

        var saida = new ByteArrayOutputStream();
        var builder = new PdfRendererBuilder();
        builder.useFont(() -> fonte("Carlito-Regular.ttf"), FONTE, 400, FontStyle.NORMAL, true);
        builder.useFont(() -> fonte("Carlito-Bold.ttf"), FONTE, 700, FontStyle.NORMAL, true);
        builder.withHtmlContent(html, null);
        builder.toStream(saida);
        try {
            builder.run();
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao gerar o termo em PDF", e);
        }
        return saida.toByteArray();
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

    private static InputStream fonte(String arquivo) {
        return TermoPdf.class.getResourceAsStream("/pdf/fontes/" + arquivo);
    }
}
