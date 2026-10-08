// Chamadas à API, agrupadas por recurso.
import { api, query } from './cliente'
import type {
  FiltroTransferencia,
  Instituicao,
  LoginResposta,
  MotivoInfo,
  Pagina,
  Painel,
  PainelSaidas,
  Perfil,
  Referencia,
  FiltroSaida,
  SaidaDetalhe,
  SaidaPedido,
  SaidaResumo,
  TransferenciaDetalhe,
  TransferenciaPedido,
  TransferenciaResumo,
  Unidade,
  Usuario,
} from './tipos'

export const authApi = {
  login: (usuario: string, senha: string) => api.post<LoginResposta>('/api/auth/login', { usuario, senha }),
  eu: () => api.get<Usuario>('/api/auth/eu'),
  trocarSenha: (senhaAtual: string, novaSenha: string) => api.put<void>('/api/auth/senha', { senhaAtual, novaSenha }),
}

export const transferenciasApi = {
  listar: (filtro: FiltroTransferencia) =>
    api.get<Pagina<TransferenciaResumo>>(`/api/transferencias${query(filtro)}`),
  lixeira: (page: number) => api.get<Pagina<TransferenciaResumo>>(`/api/transferencias/lixeira${query({ page })}`),
  autores: () => api.get<Referencia[]>('/api/transferencias/autores'),
  detalhar: (id: number) => api.get<TransferenciaDetalhe>(`/api/transferencias/${id}`),
  criar: (pedido: TransferenciaPedido) => api.post<TransferenciaDetalhe>('/api/transferencias', pedido),
  atualizar: (id: number, pedido: TransferenciaPedido) =>
    api.put<TransferenciaDetalhe>(`/api/transferencias/${id}`, pedido),
  moverParaLixeira: (id: number) => api.delete(`/api/transferencias/${id}`),
  restaurar: (id: number) => api.post<void>(`/api/transferencias/${id}/restaurar`),
  excluirDefinitivamente: (id: number) => api.delete(`/api/transferencias/${id}/definitivo`),
  termo: (id: number, formato: 'RETRATO' | 'PAISAGEM') =>
    api.blob(`/api/transferencias/${id}/termo${query({ formato })}`),
}

export const saidasApi = {
  listar: (filtro: FiltroSaida) => api.get<Pagina<SaidaResumo>>(`/api/saidas${query(filtro)}`),
  lixeira: (page: number) => api.get<Pagina<SaidaResumo>>(`/api/saidas/lixeira${query({ page })}`),
  autores: () => api.get<Referencia[]>('/api/saidas/autores'),
  detalhar: (id: number) => api.get<SaidaDetalhe>(`/api/saidas/${id}`),
  criar: (pedido: SaidaPedido) => api.post<SaidaDetalhe>('/api/saidas', pedido),
  atualizar: (id: number, pedido: SaidaPedido) => api.put<SaidaDetalhe>(`/api/saidas/${id}`, pedido),
  moverParaLixeira: (id: number) => api.delete(`/api/saidas/${id}`),
  restaurar: (id: number) => api.post<void>(`/api/saidas/${id}/restaurar`),
  excluirDefinitivamente: (id: number) => api.delete(`/api/saidas/${id}/definitivo`),
  formulario: (id: number) => api.blob(`/api/saidas/${id}/formulario`),
}

export const cadastrosApi = {
  instituicoes: () => api.get<Instituicao[]>('/api/instituicoes'),
  criarInstituicao: (nome: string) => api.post<Instituicao>('/api/instituicoes', { nome }),
  renomearInstituicao: (id: number, nome: string) => api.put<Instituicao>(`/api/instituicoes/${id}`, { nome }),
  excluirInstituicao: (id: number) => api.delete(`/api/instituicoes/${id}`),
  bloquearInstituicao: (id: number) => api.post<Instituicao>(`/api/instituicoes/${id}/bloquear`),
  desbloquearInstituicao: (id: number) => api.post<Instituicao>(`/api/instituicoes/${id}/desbloquear`),
  enviarLogo: (id: number, arquivo: File) => {
    const dados = new FormData()
    dados.append('arquivo', arquivo)
    return api.put<void>(`/api/instituicoes/${id}/logo`, dados)
  },
  removerLogo: (id: number) => api.delete(`/api/instituicoes/${id}/logo`),

  unidades: (instituicaoId?: number) => api.get<Unidade[]>(`/api/unidades${query({ instituicaoId })}`),
  criarUnidade: (nome: string, instituicaoIds: number[]) =>
    api.post<Unidade>('/api/unidades', { nome, instituicaoIds }),
  atualizarUnidade: (id: number, nome: string, instituicaoIds: number[]) =>
    api.put<Unidade>(`/api/unidades/${id}`, { nome, instituicaoIds }),
  excluirUnidade: (id: number) => api.delete(`/api/unidades/${id}`),
  bloquearUnidade: (id: number) => api.post<Unidade>(`/api/unidades/${id}/bloquear`),
  desbloquearUnidade: (id: number) => api.post<Unidade>(`/api/unidades/${id}/desbloquear`),
  enviarFotoUnidade: (id: number, arquivo: File) => {
    const dados = new FormData()
    dados.append('arquivo', arquivo)
    return api.put<void>(`/api/unidades/${id}/imagem`, dados)
  },
  removerFotoUnidade: (id: number) => api.delete(`/api/unidades/${id}/imagem`),

  motivos: () => api.get<MotivoInfo[]>('/api/motivos'),
}

export interface UsuarioPedido {
  nome: string
  login: string
  email: string
  perfil: Perfil
  senha?: string
}

export const usuariosApi = {
  listar: (filtro: { busca?: string; perfil?: string; status?: string; page?: number }) =>
    api.get<Pagina<Usuario>>(`/api/usuarios${query(filtro)}`),
  criar: (pedido: UsuarioPedido) => api.post<Usuario>('/api/usuarios', pedido),
  atualizar: (id: number, pedido: UsuarioPedido) => api.put<Usuario>(`/api/usuarios/${id}`, pedido),
  redefinirSenha: (id: number, novaSenha: string) => api.put<void>(`/api/usuarios/${id}/senha`, { novaSenha }),
  acao: (id: number, acao: 'bloquear' | 'desbloquear' | 'restaurar') =>
    api.post<Usuario>(`/api/usuarios/${id}/${acao}`),
  excluir: (id: number) => api.delete<Usuario>(`/api/usuarios/${id}`),
}

export const painelApi = {
  gerar: (filtro: { dataInicial?: string; dataFinal?: string; instituicaoId?: string }) =>
    api.get<Painel>(`/api/painel${query(filtro)}`),
  saidas: (filtro: { dataInicial?: string; dataFinal?: string; instituicaoId?: string }) =>
    api.get<PainelSaidas>(`/api/painel/saidas${query(filtro)}`),
}
