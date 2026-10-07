# Perfis e permissões

Cada usuário tem **um** perfil. Os perfis são cumulativos: cada um pode tudo o que o perfil anterior pode.

`LEITOR` < `TECNICO` < `ADMIN` < `SUPERADMIN`

## Transferências

| Ação | LEITOR | TECNICO | ADMIN | SUPERADMIN |
|---|:-:|:-:|:-:|:-:|
| Listar, consultar e filtrar | ✅ | ✅ | ✅ | ✅ |
| Painel de análise | ✅ | ✅ | ✅ | ✅ |
| Emitir o termo em PDF | ✅ | ✅ | ✅ | ✅ |
| Criar | | ✅ | ✅ | ✅ |
| Editar, mover para a lixeira, restaurar, excluir definitivamente | | só as próprias | todas | todas |
| Ver a lixeira | | só as próprias | todas | todas |

- Uma transferência **na lixeira** é invisível para quem não pode alterá-la: o detalhe responde `404`.
- **Exclusão definitiva** só a partir da lixeira.
- **Edição** só fora da lixeira.

## Instituições e unidades

| Ação | LEITOR | TECNICO | ADMIN | SUPERADMIN |
|---|:-:|:-:|:-:|:-:|
| Consultar instituições, unidades e motivos | ✅ | ✅ | ✅ | ✅ |
| Criar, alterar e excluir instituições e unidades; enviar ou remover a logo e as fotos das unidades | | | ✅ | ✅ |
| Bloquear ou desbloquear instituições e unidades | | | ✅ | ✅ |

- **Regra geral (D-035):** instituições, unidades e usuários com vínculos (transferências) **não podem ser excluídos**, só bloqueados.
- **Instituição ou unidade bloqueada:** não aparece no formulário de novas transferências, e a API recusa o uso dela. Transferências antigas continuam visíveis, filtráveis e editáveis (sem trocar a instituição ou unidade bloqueada), e os termos continuam sendo emitidos.

As imagens (`GET /api/instituicoes/{id}/logo` e `GET /api/unidades/{id}/imagem`) são públicas.

## Usuários

| Ação | LEITOR | TECNICO | ADMIN | SUPERADMIN |
|---|:-:|:-:|:-:|:-:|
| Ver o próprio perfil e trocar a própria senha | ✅ | ✅ | ✅ | ✅ |
| Listar, criar, editar, bloquear, excluir e restaurar usuários | | | ✅ ¹ | ✅ |
| Redefinir a senha de outro usuário | | | ✅ ¹ | ✅ |

¹ O ADMIN **não** pode criar usuários SUPERADMIN, promover alguém a SUPERADMIN, nem alterar, bloquear, excluir ou redefinir a senha de um SUPERADMIN (ver [D-011](decisoes.md#d-011--admin-não-cria-nem-promove-superadmin)).

## Regras de acesso

- **Usuário `BLOQUEADO` ou `EXCLUIDO`:** não consegue entrar, e perde o acesso imediatamente, mesmo que já esteja logado.
- **Usuário com `trocar_senha = true`:** só consegue trocar a própria senha, até fazer a troca. Isso acontece no primeiro acesso e depois de uma redefinição feita por um administrador.
- **Ninguém pode bloquear, excluir ou restaurar a si mesmo, nem alterar o próprio perfil.** Isso evita que um administrador perca o acesso por engano.
- **Transições de status permitidas:**
  - ATIVO → BLOQUEADO (bloquear)
  - BLOQUEADO → ATIVO (desbloquear)
  - ATIVO ou BLOQUEADO → EXCLUIDO (excluir): **só para quem nunca criou transferências**; quem tem transferências é bloqueado (D-035)
  - EXCLUIDO → ATIVO (restaurar)

## Situação da implementação

| Parte | Situação | Onde |
|---|---|---|
| Usuários e regras de acesso | ✅ implementado e testado | `usuario/UsuarioService`, `seguranca/`; testes em `AuthIntegracaoTest` e `UsuarioIntegracaoTest` |
| Transferências | ✅ implementado e testado | `transferencia/TransferenciaService`; testes em `TransferenciaIntegracaoTest` |
| Instituições e unidades | ✅ implementado e testado | `cadastro/CadastroService`; testes em `CadastroIntegracaoTest` |
| Termo em PDF | ✅ implementado e testado | `transferencia/TermoPdf`; testes em `TermoIntegracaoTest` |

### Como funciona no código

- **Perfis:** cada perfil vira uma *role* do Spring Security (`ROLE_TECNICO` etc.). A hierarquia `SUPERADMIN > ADMIN > TECNICO > LEITOR` faz com que `hasRole('ADMIN')` também aceite SUPERADMIN.
- **Troca de senha:** quem não tem troca de senha pendente recebe a autoridade `SENHA_EM_DIA`, exigida em todas as rotas exceto `/api/auth/eu` e `/api/auth/senha`.
- **Regras sobre um registro específico** (ex.: o alvo ser SUPERADMIN) ficam nos serviços e geram `403` com uma mensagem explicativa.
