// Consultas compartilhadas (cache do TanStack Query).
import { useQuery } from '@tanstack/react-query'

import { cadastrosApi, transferenciasApi } from '../api/recursos'

export const useInstituicoes = () => useQuery({ queryKey: ['instituicoes'], queryFn: cadastrosApi.instituicoes })

export const useUnidades = () => useQuery({ queryKey: ['unidades'], queryFn: () => cadastrosApi.unidades() })

export const useAutores = () => useQuery({ queryKey: ['autores'], queryFn: transferenciasApi.autores })

/** Opções de Select a partir de uma lista de {id, nome}. */
export function opcoes(lista: { id: number; nome: string }[] | undefined) {
  return (lista ?? []).map((x) => ({ value: String(x.id), label: x.nome }))
}
