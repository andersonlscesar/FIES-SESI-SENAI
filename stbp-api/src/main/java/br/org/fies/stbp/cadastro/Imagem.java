package br.org.fies.stbp.cadastro;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;

import org.springframework.web.multipart.MultipartFile;

import br.org.fies.stbp.comum.RegraNegocioException;

/**
 * Imagem guardada no banco (logo da instituição ou foto da unidade). O formato é detectado pelo conteúdo do arquivo,
 * não pelo que o navegador informa.
 */
public record Imagem(byte[] dados, String tipo) {

    public static final long TAMANHO_MAXIMO_LOGO = 1024 * 1024;
    public static final long TAMANHO_MAXIMO_FOTO = 20 * 1024 * 1024;
    /** Lado maior da foto da unidade depois de redimensionada. */
    public static final int LADO_MAXIMO_FOTO = 1200;

    /** Logo da instituição: guardada como enviada (sai impressa no termo), PNG ou JPEG de até 1 MB. */
    static Imagem logo(MultipartFile arquivo) {
        byte[] dados = ler(arquivo, TAMANHO_MAXIMO_LOGO, "A logo deve ter no máximo 1 MB");
        return new Imagem(dados, detectarTipo(dados));
    }

    /**
     * Foto da unidade: aceita PNG ou JPEG de até 20 MB e grava um JPEG de no máximo 1200 px no lado maior, com a
     * rotação EXIF aplicada (fotos de celular) e fundo branco no lugar da transparência.
     */
    static Imagem fotoUnidade(MultipartFile arquivo) {
        byte[] dados = ler(arquivo, TAMANHO_MAXIMO_FOTO, "A foto deve ter no máximo 20 MB");
        detectarTipo(dados);
        return new Imagem(redimensionarComoJpeg(dados, LADO_MAXIMO_FOTO), "image/jpeg");
    }

    static byte[] redimensionarComoJpeg(byte[] dados, int ladoMaximo) {
        BufferedImage original;
        try {
            original = ImageIO.read(new ByteArrayInputStream(dados));
        } catch (IOException e) {
            original = null;
        }
        if (original == null) {
            throw new RegraNegocioException("Não foi possível ler a imagem enviada");
        }

        int orientacao = OrientacaoExif.ler(dados);
        boolean girada90 = orientacao >= 5;
        int larguraFinal = girada90 ? original.getHeight() : original.getWidth();
        int alturaFinal = girada90 ? original.getWidth() : original.getHeight();
        double escala = Math.min(1.0, (double) ladoMaximo / Math.max(larguraFinal, alturaFinal));
        int largura = Math.max(1, (int) Math.round(larguraFinal * escala));
        int altura = Math.max(1, (int) Math.round(alturaFinal * escala));

        var destino = new BufferedImage(largura, altura, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = destino.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, largura, altura);
            g.scale(escala, escala);
            g.transform(OrientacaoExif.transformacao(orientacao, original.getWidth(), original.getHeight()));
            g.drawImage(original, 0, 0, null);
        } finally {
            g.dispose();
        }
        return codificarJpeg(destino, 0.82f);
    }

    private static byte[] codificarJpeg(BufferedImage imagem, float qualidade) {
        var escritor = ImageIO.getImageWritersByFormatName("jpeg").next();
        var parametros = escritor.getDefaultWriteParam();
        parametros.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        parametros.setCompressionQuality(qualidade);
        var saida = new ByteArrayOutputStream();
        try (var fluxo = ImageIO.createImageOutputStream(saida)) {
            escritor.setOutput(fluxo);
            escritor.write(null, new IIOImage(imagem, null, null), parametros);
        } catch (IOException e) {
            throw new IllegalStateException("Falha ao gerar o JPEG", e);
        } finally {
            escritor.dispose();
        }
        return saida.toByteArray();
    }

    private static byte[] ler(MultipartFile arquivo, long tamanhoMaximo, String mensagemTamanho) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new RegraNegocioException("Envie o arquivo da imagem");
        }
        if (arquivo.getSize() > tamanhoMaximo) {
            throw new RegraNegocioException(mensagemTamanho);
        }
        try {
            return arquivo.getBytes();
        } catch (IOException e) {
            throw new RegraNegocioException("Não foi possível ler o arquivo enviado");
        }
    }

    private static String detectarTipo(byte[] d) {
        if (d.length > 8 && (d[0] & 0xFF) == 0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G') {
            return "image/png";
        }
        if (d.length > 3 && (d[0] & 0xFF) == 0xFF && (d[1] & 0xFF) == 0xD8 && (d[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        throw new RegraNegocioException("A imagem deve ser PNG ou JPEG");
    }

    /** Lê a orientação EXIF (1 a 8) de um JPEG; 1 (normal) se ausente ou ilegível. */
    static final class OrientacaoExif {

        private OrientacaoExif() {
        }

        static int ler(byte[] d) {
            try {
                if (d.length < 4 || (d[0] & 0xFF) != 0xFF || (d[1] & 0xFF) != 0xD8) {
                    return 1;
                }
                int i = 2;
                while (i + 4 <= d.length && (d[i] & 0xFF) == 0xFF) {
                    int marcador = d[i + 1] & 0xFF;
                    int tamanho = ((d[i + 2] & 0xFF) << 8) | (d[i + 3] & 0xFF);
                    if (marcador == 0xE1 && i + 10 <= d.length && new String(d, i + 4, 4).equals("Exif")) {
                        return lerTiff(d, i + 10);
                    }
                    if (marcador == 0xDA) {
                        return 1; // início dos dados da imagem: não há EXIF
                    }
                    i += 2 + tamanho;
                }
            } catch (RuntimeException e) {
                // EXIF malformado: ignora
            }
            return 1;
        }

        private static int lerTiff(byte[] d, int base) {
            boolean intel = d[base] == 'I';
            int ifd = base + inteiro(d, base + 4, 4, intel);
            int entradas = inteiro(d, ifd, 2, intel);
            for (int e = 0; e < entradas; e++) {
                int entrada = ifd + 2 + e * 12;
                if (inteiro(d, entrada, 2, intel) == 0x0112) {
                    int valor = inteiro(d, entrada + 8, 2, intel);
                    return valor >= 1 && valor <= 8 ? valor : 1;
                }
            }
            return 1;
        }

        private static int inteiro(byte[] d, int pos, int bytes, boolean intel) {
            int v = 0;
            for (int k = 0; k < bytes; k++) {
                int b = d[pos + (intel ? bytes - 1 - k : k)] & 0xFF;
                v = (v << 8) | b;
            }
            return v;
        }

        /** Transformação que leva a imagem crua (largura x altura) à orientação correta. */
        static AffineTransform transformacao(int orientacao, int largura, int altura) {
            var t = new AffineTransform();
            switch (orientacao) {
                case 2 -> { t.translate(largura, 0); t.scale(-1, 1); }
                case 3 -> { t.translate(largura, altura); t.rotate(Math.PI); }
                case 4 -> { t.translate(0, altura); t.scale(1, -1); }
                case 5 -> { t.rotate(Math.PI / 2); t.scale(1, -1); }
                case 6 -> { t.translate(altura, 0); t.rotate(Math.PI / 2); }
                case 7 -> { t.scale(-1, 1); t.translate(-altura, 0); t.translate(0, largura); t.rotate(3 * Math.PI / 2); }
                case 8 -> { t.translate(0, largura); t.rotate(3 * Math.PI / 2); }
                default -> { }
            }
            return t;
        }
    }
}
