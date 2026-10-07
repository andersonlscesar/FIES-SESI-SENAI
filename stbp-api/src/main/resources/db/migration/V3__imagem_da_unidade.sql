-- A foto da unidade volta (D-031): exibida nos cartões das transferências, como no sistema antigo.
-- Gravada sempre como JPEG redimensionado pela API (ou pelo script de migração).
ALTER TABLE unidade ADD COLUMN imagem BYTEA;
ALTER TABLE unidade ADD COLUMN imagem_tipo VARCHAR(30);
ALTER TABLE unidade ADD CONSTRAINT ck_unidade_imagem
    CHECK ((imagem IS NULL) = (imagem_tipo IS NULL) AND (imagem_tipo IS NULL OR imagem_tipo IN ('image/png', 'image/jpeg')));
