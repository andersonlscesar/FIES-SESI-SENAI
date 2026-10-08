import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'

import { ApiErro } from '../api/cliente'
import { saidasApi, transferenciasApi } from '../api/recursos'
import type { Motivo, TipoSaida } from '../api/tipos'

export const MOTIVOS: Record<Motivo, { nome: string; curto: string; tipo: 'Definitiva' | 'Temporária'; cor: string }> = {
  TRANSFERENCIA_ENTRE_FILIAIS: { nome: 'Transferência entre filiais', curto: 'Entre filiais', tipo: 'Definitiva', cor: 'azul' },
  BAIXA_DESCARTE: { nome: 'Baixa / Descarte', curto: 'Baixa/Descarte', tipo: 'Definitiva', cor: 'red' },
  MANUTENCAO: { nome: 'Manutenção', curto: 'Manutenção', tipo: 'Temporária', cor: 'orange' },
  EMPRESTIMO_TEMPORARIO: { nome: 'Empréstimo temporário', curto: 'Empréstimo', tipo: 'Temporária', cor: 'teal' },
}

/** Tipos do Controle de Saída de Materiais (quadros do formulário FM-072-UOP-04). */
export const TIPOS_SAIDA: Record<TipoSaida, { nome: string; cor: string }> = {
  PERMANENTE: { nome: 'Permanente', cor: 'azul' },
  TEMPORARIO: { nome: 'Temporário', cor: 'teal' },
  MANUTENCAO: { nome: 'Manutenção', cor: 'orange' },
  EVENTO: { nome: 'Evento', cor: 'grape' },
  OUTRO: { nome: 'Outro', cor: 'gray' },
}

/** "Outro: doação" quando o tipo é OUTRO; o nome do tipo nos demais. */
export function descreverTipoSaida(tipo: TipoSaida, tipoOutro: string | null): string {
  return tipo === 'OUTRO' && tipoOutro ? `Outro: ${tipoOutro}` : TIPOS_SAIDA[tipo].nome
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
export function abrirTermo(id: number, formato: 'RETRATO' | 'PAISAGEM') {
  return abrirPdf(() => transferenciasApi.termo(id, formato))
}

/** Abre o formulário FM-072-UOP-04 (controle de saída) em PDF numa nova aba. */
export function abrirFormularioSaida(id: number) {
  return abrirPdf(() => saidasApi.formulario(id))
}

async function abrirPdf(baixar: () => Promise<Blob>) {
  const aba = window.open('', '_blank')
  try {
    const pdf = await baixar()
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
