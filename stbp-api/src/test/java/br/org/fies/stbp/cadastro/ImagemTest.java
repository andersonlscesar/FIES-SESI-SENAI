package br.org.fies.stbp.cadastro;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;

class ImagemTest {

    static byte[] imagem(String formato, int largura, int altura) throws Exception {
        var img = new BufferedImage(largura, altura, BufferedImage.TYPE_INT_RGB);
        var g = img.createGraphics();
        g.setColor(Color.RED);
        g.fillRect(0, 0, largura / 2, altura); // metade esquerda vermelha, para conferir a rotação
        g.setColor(Color.BLUE);
        g.fillRect(largura / 2, 0, largura - largura / 2, altura);
        g.dispose();
        var saida = new ByteArrayOutputStream();
        ImageIO.write(img, formato, saida);
        return saida.toByteArray();
    }

    /** Insere um segmento APP1/EXIF (big-endian) só com a tag de orientação logo após o SOI do JPEG. */
    static byte[] comOrientacaoExif(byte[] jpeg, int orientacao) {
        byte[] tiff = {
            'M', 'M', 0, 42, 0, 0, 0, 8,            // cabeçalho TIFF; IFD0 no deslocamento 8
            0, 1,                                    // 1 entrada
            0x01, 0x12, 0, 3, 0, 0, 0, 1,            // tag 0x0112 (Orientation), SHORT, 1 valor
            0, (byte) orientacao, 0, 0,              // valor
            0, 0, 0, 0                               // próximo IFD: nenhum
        };
        byte[] exif = new byte[6 + tiff.length];
        System.arraycopy("Exif\0\0".getBytes(), 0, exif, 0, 6);
        System.arraycopy(tiff, 0, exif, 6, tiff.length);
        int tamanho = exif.length + 2;

        var saida = new ByteArrayOutputStream();
        saida.write(0xFF);
        saida.write(0xD8);
        saida.write(0xFF);
        saida.write(0xE1);
        saida.write(tamanho >> 8);
        saida.write(tamanho & 0xFF);
        saida.writeBytes(exif);
        saida.write(jpeg, 2, jpeg.length - 2);
        return saida.toByteArray();
    }

    private static BufferedImage ler(byte[] dados) throws Exception {
        return ImageIO.read(new ByteArrayInputStream(dados));
    }

    @Test
    void reduzFotoGrandeParaNoMaximo1200PxMantendoAProporcao() throws Exception {
        var resultado = ler(Imagem.redimensionarComoJpeg(imagem("png", 3000, 1500), 1200));
        assertThat(resultado.getWidth()).isEqualTo(1200);
        assertThat(resultado.getHeight()).isEqualTo(600);
    }

    @Test
    void naoAmpliaFotoPequena() throws Exception {
        var resultado = ler(Imagem.redimensionarComoJpeg(imagem("png", 300, 200), 1200));
        assertThat(resultado.getWidth()).isEqualTo(300);
        assertThat(resultado.getHeight()).isEqualTo(200);
    }

    @Test
    void aplicaARotacaoExifDeFotosDeCelular() throws Exception {
        byte[] jpeg = comOrientacaoExif(imagem("jpeg", 200, 100), 6);
        assertThat(Imagem.OrientacaoExif.ler(jpeg)).isEqualTo(6);

        var resultado = ler(Imagem.redimensionarComoJpeg(jpeg, 1200));
        // Orientação 6 = girar 90° no sentido horário: 200x100 vira 100x200, e a metade esquerda (vermelha) vai para cima
        assertThat(resultado.getWidth()).isEqualTo(100);
        assertThat(resultado.getHeight()).isEqualTo(200);
        var cima = new Color(resultado.getRGB(50, 20));
        var baixo = new Color(resultado.getRGB(50, 180));
        assertThat(cima.getRed()).isGreaterThan(200);
        assertThat(baixo.getBlue()).isGreaterThan(200);
    }

    @Test
    void semExifConsideraOrientacaoNormal() throws Exception {
        assertThat(Imagem.OrientacaoExif.ler(imagem("jpeg", 10, 10))).isEqualTo(1);
        assertThat(Imagem.OrientacaoExif.ler(imagem("png", 10, 10))).isEqualTo(1);
    }
}
