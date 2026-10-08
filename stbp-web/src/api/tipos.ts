// Tipos espelhando os DTOs da API (ver stbp-api/docs/api.md).

export type Perfil = 'LEITOR' | 'TECNICO' | 'ADMIN' | 'SUPERADMIN'
export type StatusUsuario = 'ATIVO' | 'BLOQUEADO' | 'EXCLUIDO'
export type Motivo = 'TRANSFERENCIA_ENTRE_FILIAIS' | 'BAIXA_DESCARTE' | 'MANUTENCAO' | 'EMPRESTIMO_TEMPORARIO'

export const ORDEM_PERFIS: Perfil[] = ['LEITOR', 'TECNICO', 'ADMIN', 'SUPERADMIN']

export const NOMES_PERFIL: Record<Perfil, string> = {
  LEITOR: 'Leitor',
  TECNICO: 'Técnico',
  ADMIN: 'Administrador',
  SUPERADMIN: 'Superadministrador',
}

export const NOMES_STATUS: Record<StatusUsuario, string> = {
  ATIVO: 'Ativo',
  BLOQUEADO: 'Bloqueado',
  EXCLUIDO: 'Excluído',
}

export interface Pagina<T> {
  conteudo: T[]
  pagina: number
  tamanho: number
  totalElementos: number
  totalPaginas: number
}

export interface Usuario {
  id: number
  nome: string
  login: string
  email: string
  perfil: Perfil
  status: StatusUsuario
  trocarSenha: boolean
  /** Criou transferências ou saídas de materiais: não pode ser excluído, só bloqueado. */
  emUso: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface LoginResposta {
  token: string
  expiraEm: string
  usuario: Usuario
}

export interface Referencia {
  id: number
  nome: string
}

export interface Instituicao {
  id: number
  nome: string
  logoUrl: string | null
  /** false = bloqueada para novas transferências (o histórico continua). */
  ativa: boolean
  /** Já usada em transferências ou saídas de materiais: não pode ser excluída, só bloqueada. */
  emUso: boolean
}

export interface Unidade {
  id: number
  nome: string
  /** Endereço público da foto da unidade (null se não houver). */
  imagemUrl: string | null
  /** false = bloqueada para novas transferências (o histórico continua). */
  ativa: boolean
  /** Já é origem ou destino de transferências: não pode ser excluída, só bloqueada. */
  emUso: boolean
  instituicaoIds: number[]
}

/** Unidade de origem/destino de uma transferência. */
export interface UnidadeReferencia {
  id: number
  nome: string
  imagemUrl: string | null
}

export interface MotivoInfo {
  codigo: Motivo
  descricao: string
  tipo: 'DEFINITIVA' | 'TEMPORARIA'
}

export interface TransferenciaResumo {
  id: number
  data: string
  motivo: Motivo
  instituicao: Referencia
  origem: UnidadeReferencia
  destino: UnidadeReferencia
  responsavelEnvio: string
  responsavelRecebimento: string
  criadoPor: Referencia
  quantidadeItens: number
  criadoEm: string
  excluidoEm: string | null
}

export interface Item {
  id: number
  ordem: number
  descricao: string
  patrimonio: string | null
  observacao: string | null
}

export interface TransferenciaDetalhe extends Omit<TransferenciaResumo, 'quantidadeItens'> {
  itens: Item[]
  atualizadoEm: string
  podeAlterar: boolean
}

export interface ItemPedido {
  id?: number
  descricao: string
  patrimonio: string
  observacao: string
}

export interface TransferenciaPedido {
  data: string
  motivo: Motivo
  instituicaoId: number
  origemId: number
  destinoId: number
  responsavelEnvio: string
  responsavelRecebimento: string
  itens: ItemPedido[]
}

export interface FiltroTransferencia {
  busca?: string
  instituicaoId?: string
  origemId?: string
  destinoId?: string
  criadoPorId?: string
  motivo?: string
  dataInicial?: string
  dataFinal?: string
  minhas?: string
  page?: string
}

// ---- Controle de Saída de Materiais (FM-072-UOP-04)

export type TipoSaida = 'PERMANENTE' | 'TEMPORARIO' | 'MANUTENCAO' | 'EVENTO' | 'OUTRO'

export interface SaidaResumo {
  id: number
  data: string
  tipo: TipoSaida
  /** Só quando tipo = OUTRO ("Outro, qual: ..."). */
  tipoOutro: string | null
  instituicao: Referencia
  origem: UnidadeReferencia
  /** Unidade de destino; null quando o destino é externo. */
  destino: UnidadeReferencia | null
  destinoExterno: string | null
  /** Nome do destino, unidade ou externo. */
  nomeDestino: string
  portador: string | null
  criadoPor: Referencia
  quantidadeItens: number
  criadoEm: string
  excluidoEm: string | null
}

/** Item do controle de saída: sem patrimônio, com as áreas de saída e entrada. */
export interface ItemSaida extends Omit<Item, 'patrimonio'> {
  areaSaida: string | null
  areaEntrada: string | null
}

export interface SaidaDetalhe extends Omit<SaidaResumo, 'quantidadeItens'> {
  itens: ItemSaida[]
  atualizadoEm: string
  podeAlterar: boolean
}

export interface ItemSaidaPedido extends Omit<ItemPedido, 'patrimonio'> {
  areaSaida: string
  areaEntrada: string
}

export interface SaidaPedido {
  data: string
  tipo: TipoSaida
  tipoOutro: string | null
  instituicaoId: number
  origemId: number
  /** Uma unidade OU um destino externo, nunca os dois. */
  destinoId: number | null
  destinoExterno: string | null
  portador: string | null
  itens: ItemSaidaPedido[]
}

export interface FiltroSaida {
  busca?: string
  instituicaoId?: string
  origemId?: string
  destinoId?: string
  criadoPorId?: string
  tipo?: string
  dataInicial?: string
  dataFinal?: string
  minhas?: string
  page?: string
}

// ---- Painel de análise (GET /api/painel)

export interface PainelContagem {
  id: number
  nome: string
  transferencias: number
  itens: number
}

export interface Painel {
  periodo: { inicio: string; fim: string }
  periodoAnterior: { inicio: string; fim: string }
  resumo: {
    transferencias: number
    itens: number
    itensSemPatrimonio: number
    unidadesEnvolvidas: number
    transferenciasAnterior: number
    itensAnterior: number
  }
  porMes: { mes: string; transferencias: number; itens: number }[]
  porMotivo: { motivo: Motivo; descricao: string; transferencias: number; itens: number }[]
  porInstituicao: PainelContagem[]
  principaisOrigens: PainelContagem[]
  principaisDestinos: PainelContagem[]
  principaisRotas: { origem: string; destino: string; transferencias: number; itens: number }[]
  principaisEmissores: PainelContagem[]
  bensMaisTransferidos: { descricao: string; itens: number; transferencias: number }[]
}

// ---- Painel de saídas de materiais (GET /api/painel/saidas)

export interface PainelSaidasContagem {
  id: number
  nome: string
  saidas: number
  itens: number
}

export interface PainelSaidas {
  periodo: { inicio: string; fim: string }
  periodoAnterior: { inicio: string; fim: string }
  resumo: {
    saidas: number
    itens: number
    paraDestinoExterno: number
    unidadesEnvolvidas: number
    saidasAnterior: number
    itensAnterior: number
  }
  porMes: { mes: string; saidas: number; itens: number }[]
  porTipo: { tipo: TipoSaida; descricao: string; saidas: number; itens: number }[]
  porInstituicao: PainelSaidasContagem[]
  principaisOrigens: PainelSaidasContagem[]
  /** Unidades e destinos externos ({@code externo}) no mesmo ranking. */
  principaisDestinos: { nome: string; externo: boolean; saidas: number; itens: number }[]
  principaisRotas: { origem: string; destino: string; destinoExterno: boolean; saidas: number; itens: number }[]
  principaisEmissores: PainelSaidasContagem[]
  materiaisMaisFrequentes: { descricao: string; itens: number; saidas: number }[]
}
