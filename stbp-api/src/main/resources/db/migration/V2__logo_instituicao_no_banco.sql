-- A logo da instituição (impressa no termo) passa a ser enviada pela API e guardada no banco.
ALTER TABLE instituicao DROP COLUMN logo;
ALTER TABLE instituicao ADD COLUMN logo BYTEA;
ALTER TABLE instituicao ADD COLUMN logo_tipo VARCHAR(30);
ALTER TABLE instituicao ADD CONSTRAINT ck_instituicao_logo
    CHECK ((logo IS NULL) = (logo_tipo IS NULL) AND (logo_tipo IS NULL OR logo_tipo IN ('image/png', 'image/jpeg')));

-- Fotos das unidades eram apenas decorativas no sistema antigo (ver D-022).
ALTER TABLE unidade DROP COLUMN imagem;
