-- Instituições em uso não são excluídas: são bloqueadas para novas transferências (D-033).
ALTER TABLE instituicao ADD COLUMN ativa BOOLEAN NOT NULL DEFAULT TRUE;
