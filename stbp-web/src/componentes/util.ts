import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'

import { ApiErro } from '../api/cliente'
import { transferenciasApi } from '../api/recursos'
import type { Motivo } from '../api/tipos'

export const MOTIVOS: Record<Motivo, { nome: string; curto: string; tipo: 'Definitiva' | 'Temporária'; cor: string }> = {
  TRANSFERENCIA_ENTRE_FILIAIS: { nome: 'Transferência entre filiais', curto: 'Entre filiais', tipo: 'Definitiva', cor: 'azul' },
  BAIXA_DESCARTE: { nome: 'Baixa / Descarte', curto: 'Baixa/Descarte', tipo: 'Definitiva', cor: 'red' },
  MANUTENCAO: { nome: 'Manutenção', curto: 'Manutenção', tipo: 'Temporária', cor: 'orange' },
  EMPRESTIMO_TEMPORARIO: { nome: 'Empréstimo temporário', curto: 'Empréstimo', tipo: 'Temporária', cor: 'teal' },
}

/** "2026-10-06" ou ISO com horário → "06/10/2026". */
export function formatarData(valor: string | null | undefined): string {
  return valor ? dayjs(valor).format('DD/MM/YYYY') : ''
}

export function formatarDataHora(valor: string | null | undefined): string {
  return valor ? dayjs(valor).format('DD/MM/YYYY HH:mm') : ''
}

export function mensagemDeErro(erro: unknown): string {
  return erro instanceof ApiErro || erro instanceof Error ? erro.message : 'Erro inesperado.'
}

export function notificarErro(erro: unknown) {
  notifications.show({ color: 'red', title: 'Não foi possível concluir', message: mensagemDeErro(erro) })
}

export function notificarSucesso(mensagem: string) {
  notifications.show({ color: 'green', message: mensagem })
}

/**
 * Abre o termo em PDF numa nova aba. A aba é aberta antes da requisição (ainda no clique),
 * para não ser bloqueada pelo navegador; o PDF é baixado com o token e exibido em seguida.
 */
export async function abrirTermo(id: number, formato: 'RETRATO' | 'PAISAGEM') {
  const aba = window.open('', '_blank')
  try {
    const pdf = await transferenciasApi.termo(id, formato)
    const url = URL.createObjectURL(pdf)
    if (aba) aba.location.href = url
    else window.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (erro) {
    aba?.close()
    notificarErro(erro)
  }
}

/** Converte os erros de campo da API ("itens[0].descricao") para o formato do @mantine/form ("itens.0.descricao"). */
export function errosDeCampo(erro: unknown): Record<string, string> {
  if (!(erro instanceof ApiErro)) return {}
  return Object.fromEntries(
    Object.entries(erro.campos).map(([campo, mensagem]) => [campo.replace(/\[(\d+)\]/g, '.$1'), mensagem]),
  )
}
