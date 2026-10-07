-- Cadastros com transferências não são excluídos: são bloqueados (D-035).

-- Unidades em uso podem ser bloqueadas para novas transferências
ALTER TABLE unidade ADD COLUMN ativa BOOLEAN NOT NULL DEFAULT TRUE;

-- Usuários excluídos que têm transferências passam a bloqueados (o efeito é o mesmo: sem acesso).
-- O sistema antigo permitia excluir usuários com transferências; a nova regra não.
UPDATE usuario u
   SET status = 'BLOQUEADO'
 WHERE u.status = 'EXCLUIDO'
   AND EXISTS (SELECT 1 FROM transferencia t WHERE t.criado_por_id = u.id);
