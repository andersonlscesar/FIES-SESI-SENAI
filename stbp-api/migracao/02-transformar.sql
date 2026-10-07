-- Converte os dados do schema "legado" (cópia do MySQL) para o modelo novo.
-- Mantém os IDs originais: números de termos já impressos continuam válidos.
\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM usuario) THEN
        RAISE EXCEPTION 'O banco de destino já possui dados; a migração deve rodar num banco recém-criado';
    END IF;
END $$;

-- O MyISAM nunca garantiu chaves estrangeiras.
-- Itens de saídas excluídas definitivamente ficaram para trás: são descartados (e listados).
DO $$
DECLARE
    descartados TEXT;
BEGIN
    SELECT string_agg(format('item %s (saída %s): %s', i.id_item, i.saida_id, i.descricao), E'\n' ORDER BY i.id_item)
      INTO descartados
      FROM legado.itens i LEFT JOIN legado.saidas s ON s.id_saida = i.saida_id WHERE s.id_saida IS NULL;

    IF descartados IS NOT NULL THEN
        RAISE NOTICE E'Itens descartados por pertencerem a saídas excluídas:\n%', descartados;
    END IF;
END $$;

-- Qualquer outro registro órfão aborta a migração
DO $$
DECLARE
    orfaos TEXT;
BEGIN
    SELECT string_agg(descricao || ': ' || ids, E'\n') INTO orfaos FROM (
        SELECT 'saídas sem usuário' AS descricao, string_agg(s.id_saida::text, ',') AS ids
          FROM legado.saidas s LEFT JOIN legado.users u ON u.id = s.user_id WHERE u.id IS NULL
        UNION ALL
        SELECT 'saídas sem instituição', string_agg(s.id_saida::text, ',')
          FROM legado.saidas s LEFT JOIN legado.instituicoes x ON x.id_instituicao = s.instituicao_id WHERE x.id_instituicao IS NULL
        UNION ALL
        SELECT 'saídas sem unidade remetente', string_agg(s.id_saida::text, ',')
          FROM legado.saidas s LEFT JOIN legado.unidades x ON x.id_unidade = s.remetente_id WHERE x.id_unidade IS NULL
        UNION ALL
        SELECT 'saídas sem unidade destinatária', string_agg(s.id_saida::text, ',')
          FROM legado.saidas s LEFT JOIN legado.unidades x ON x.id_unidade = s.destinatario_id WHERE x.id_unidade IS NULL
        UNION ALL
        SELECT 'saídas com motivo desconhecido', string_agg(s.id_saida::text, ',')
          FROM legado.saidas s WHERE s.motivo_id NOT IN (1, 2, 3, 4)
    ) o WHERE ids IS NOT NULL;

    IF orfaos IS NOT NULL THEN
        RAISE EXCEPTION E'Registros órfãos no banco legado:\n%', orfaos;
    END IF;
END $$;

-- Nível de acesso: o maior entre as permissions do spatie atribuídas ao usuário
INSERT INTO usuario (id, nome, login, email, senha_hash, perfil, status, trocar_senha, criado_em, atualizado_em)
SELECT u.id,
       trim(u.name),
       trim(u.user_name),
       lower(trim(u.email)),
       u.password,
       CASE (SELECT max(CASE p.name
                            WHEN 'superadministrador' THEN 4
                            WHEN 'administrador' THEN 3
                            WHEN 'técnico' THEN 2
                            ELSE 1 END)
               FROM legado.model_has_permissions mp
               JOIN legado.permissions p ON p.id = mp.permission_id
              WHERE mp.model_id = u.id)
           WHEN 4 THEN 'SUPERADMIN'
           WHEN 3 THEN 'ADMIN'
           WHEN 2 THEN 'TECNICO'
           ELSE 'LEITOR' END,
       -- Usuário com transferências não pode estar excluído (D-035): o excluído com vínculos vira bloqueado
       CASE WHEN u.deleted_at IS NOT NULL
                 AND EXISTS (SELECT 1 FROM legado.saidas s WHERE s.user_id = u.id) THEN 'BLOQUEADO'
            WHEN u.deleted_at IS NOT NULL THEN 'EXCLUIDO'
            WHEN u.is_blocked::int <> 0 THEN 'BLOQUEADO'
            ELSE 'ATIVO' END,
       u.is_first_login IS NULL OR u.is_password_reset_by_adm::int <> 0,
       coalesce(u.created_at, now()),
       coalesce(u.updated_at, u.created_at, now())
  FROM legado.users u;

-- As logos e as fotos das unidades são carregadas a partir dos arquivos do sistema antigo pelo migrar.sh
INSERT INTO instituicao (id, nome)
SELECT id_instituicao, trim(instituicao)
  FROM legado.instituicoes;

INSERT INTO unidade (id, nome)
SELECT id_unidade, trim(name)
  FROM legado.unidades;

INSERT INTO unidade_instituicao (unidade_id, instituicao_id)
SELECT DISTINCT unidade_id, instituicao_id
  FROM legado.unidades_instituicoes;

-- data_saida era um TIMESTAMP gravado em UTC a partir de uma data local (ex.: 31/10 -> 2023-10-31 03:00Z)
INSERT INTO transferencia (id, data, motivo, instituicao_id, origem_id, destino_id, responsavel_envio,
                           responsavel_recebimento, criado_por_id, criado_em, atualizado_em, excluido_em)
SELECT s.id_saida,
       (s.data_saida AT TIME ZONE 'America/Sao_Paulo')::date,
       CASE s.motivo_id
           WHEN 1 THEN 'TRANSFERENCIA_ENTRE_FILIAIS'
           WHEN 2 THEN 'BAIXA_DESCARTE'
           WHEN 3 THEN 'MANUTENCAO'
           WHEN 4 THEN 'EMPRESTIMO_TEMPORARIO' END,
       s.instituicao_id,
       s.remetente_id,
       s.destinatario_id,
       trim(s.responsavel_envio),
       trim(s.responsavel_recebimento),
       s.user_id,
       coalesce(s.created_at, s.data_saida),
       coalesce(s.updated_at, s.created_at, s.data_saida),
       s.deleted_at
  FROM legado.saidas s;

-- "s/p", "S/P", "sp"... viram NULL (sem patrimônio)
INSERT INTO item (id, transferencia_id, ordem, descricao, patrimonio, observacao)
SELECT i.id_item,
       i.saida_id,
       row_number() OVER (PARTITION BY i.saida_id ORDER BY i.id_item),
       trim(i.descricao),
       CASE WHEN regexp_replace(upper(i.patrimonio), '[^A-Z0-9]', '', 'g') IN ('', 'SP') THEN NULL
            ELSE trim(i.patrimonio) END,
       nullif(trim(replace(i.observacao, E'\r\n', E'\n')), '')
  FROM legado.itens i
  JOIN legado.saidas s ON s.id_saida = i.saida_id;

SELECT setval(pg_get_serial_sequence('usuario', 'id'), (SELECT max(id) FROM usuario));
SELECT setval(pg_get_serial_sequence('instituicao', 'id'), (SELECT max(id) FROM instituicao));
SELECT setval(pg_get_serial_sequence('unidade', 'id'), (SELECT max(id) FROM unidade));
SELECT setval(pg_get_serial_sequence('transferencia', 'id'), (SELECT max(id) FROM transferencia));
SELECT setval(pg_get_serial_sequence('item', 'id'), (SELECT max(id) FROM item));

-- Conferência: quantidades do legado x novo
SELECT tabela, legado, novo, CASE WHEN legado = novo THEN 'ok' ELSE 'DIVERGENTE' END AS situacao FROM (
    SELECT 'usuarios' AS tabela, (SELECT count(*) FROM legado.users) AS legado, (SELECT count(*) FROM usuario) AS novo
    UNION ALL SELECT 'instituicoes', (SELECT count(*) FROM legado.instituicoes), (SELECT count(*) FROM instituicao)
    UNION ALL SELECT 'unidades', (SELECT count(*) FROM legado.unidades), (SELECT count(*) FROM unidade)
    UNION ALL SELECT 'transferencias', (SELECT count(*) FROM legado.saidas), (SELECT count(*) FROM transferencia)
    UNION ALL SELECT 'itens', (SELECT count(*) FROM legado.itens i JOIN legado.saidas s ON s.id_saida = i.saida_id),
                              (SELECT count(*) FROM item)
) c;

SELECT perfil, status, count(*) FROM usuario GROUP BY perfil, status ORDER BY perfil, status;

COMMIT;
