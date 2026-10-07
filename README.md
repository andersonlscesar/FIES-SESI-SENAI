# STBP: Sistema de Transferência de Bens Patrimoniais

Reimplementação do sistema de transferências de bens patrimoniais (FIES / SESI / SENAI), que antes era feito em Laravel + MySQL.

| Pasta | Conteúdo |
|---|---|
| [stbp-api/](stbp-api/) | API em Spring Boot + PostgreSQL: regras, login, termo em PDF e **migração dos dados** do sistema antigo. Documentação em [stbp-api/docs/](stbp-api/docs/) |
| [stbp-web/](stbp-web/) | Telas em React + TypeScript |
| [implantacao/](implantacao/) | Docker Compose de produção, backup e **guia de implantação e virada** |
| `fies-main/` | Código do sistema Laravel antigo (referência; fonte das logos na migração) |
| `BKP_STBP/` | Dump do banco MySQL antigo |

## Por onde começar

- **Instalar no servidor e fazer a virada:** [implantacao/README.md](implantacao/README.md)
- **Desenvolver:** [stbp-api/README.md](stbp-api/README.md) e [stbp-web/README.md](stbp-web/README.md)
- **Entender as regras e as decisões:**
  - [perfis e permissões](stbp-api/docs/perfis-e-permissoes.md)
  - [API](stbp-api/docs/api.md)
  - [modelo de dados](stbp-api/docs/modelo-de-dados.md)
  - [registro de decisões](stbp-api/docs/decisoes.md)
# FIES-SESI-SENAI
