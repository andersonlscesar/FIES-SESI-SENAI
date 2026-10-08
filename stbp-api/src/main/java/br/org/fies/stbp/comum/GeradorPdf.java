package br.org.fies.stbp.comum;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

/**
 * Renderiza um template XHTML de resources/pdf/ (Thymeleaf em modo XML) em PDF, com as fontes embutidas.
 * <ul>
 * <li>{@code Carlito}: Termo de Transferência (métrica do Calibri do termo original).</li>
 * <li>{@code DejaVu}: Controle de Saída de Materiais. O FM-072-UOP-04 em papel usa DejaVu Sans Condensed no texto e
 * DejaVu Sans Bold nos títulos, e a família reproduz a mesma combinação (peso 400 e 700).</li>
 * </ul>
 */
@Component
public class GeradorPdf {

    private static final String FONTE = "Carlito";

    private final TemplateEngine templates;

    GeradorPdf() {
        var resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("pdf/");
        resolver.setSuffix(".xhtml");
        resolver.setTemplateMode(TemplateMode.XML);
        resolver.setCharacterEncoding("UTF-8");
        this.templates = new TemplateEngine();
        this.templates.setTemplateResolver(resolver);
    }

    public byte[] renderizar(String template, Map<String, Object> variaveis) {
        var contexto = new Context();
        contexto.setVariables(variaveis);
        String html = templates.process(template, contexto);

        var saida = new ByteArrayOutputStream();
        var builder = new PdfRendererBuilder();
        builder.useFont(() -> fonte("Carlito-Regular.ttf"), FONTE, 400, FontStyle.NORMAL, true);
        builder.useFont(() -> fonte("Carlito-Bold.ttf"), FONTE, 700, FontStyle.NORMAL, true);
        builder.useFont(() -> fonte("DejaVuSansCondensed.ttf"), "DejaVu", 400, FontStyle.NORMAL, true);
        builder.useFont(() -> fonte("DejaVuSans-Bold.ttf"), "DejaVu", 700, FontStyle.NORMAL, true);
        builder.withHtmlContent(html, null);
        builder.toStream(saida);
        try {
            builder.run();
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao gerar o PDF " + template, e);
        }
        return saida.toByteArray();
    }

    private static InputStream fonte(String arquivo) {
        return GeradorPdf.class.getResourceAsStream("/pdf/fontes/" + arquivo);
    }
}
