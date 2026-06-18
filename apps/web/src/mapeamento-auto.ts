// Auto-correspondência entre cabeçalhos do arquivo e campos canônicos.
// Usado no Upload para pré-preencher o mapeamento sem digitação manual.

export interface CampoCanonico {
  campo: string;
  rotulo: string;
  obrigatorio?: boolean;
  /** Termos (normalizados) que costumam aparecer no cabeçalho do arquivo. */
  sinonimos: string[];
}

export const CAMPOS_CANONICOS: CampoCanonico[] = [
  { campo: 'iccid', rotulo: 'ICCID', obrigatorio: true, sinonimos: ['iccid', 'sim', 'simcard', 'chip', 'serial'] },
  { campo: 'msisdn', rotulo: 'MSISDN / Linha', sinonimos: ['msisdn', 'linha', 'telefone', 'numero', 'celular', 'fone'] },
  { campo: 'plano', rotulo: 'Plano', sinonimos: ['plano', 'plan', 'pacote', 'oferta'] },
  { campo: 'consumo', rotulo: 'Consumo', sinonimos: ['consumo', 'trafego', 'dados', 'uso', 'volume', 'usage', 'traffic'] },
  { campo: 'custo', rotulo: 'Custo', sinonimos: ['custo', 'valor', 'preco', 'mensalidade', 'cobranca', 'fatura', 'cost'] },
  { campo: 'status', rotulo: 'Status', sinonimos: ['status', 'situacao', 'estado', 'state'] },
  { campo: 'ultimaConexao', rotulo: 'Última conexão', sinonimos: ['ultimaconexao', 'conexao', 'lastconnection', 'ultimoacesso', 'lastseen', 'ultimavez'] },
  { campo: 'franquia', rotulo: 'Franquia', sinonimos: ['franquia', 'limite', 'cota', 'allowance'] },
  { campo: 'operadora', rotulo: 'Operadora conectada', sinonimos: ['operadora', 'carrier', 'rede', 'network', 'operator'] },
];

/** minúsculas, sem acentos, só alfanumérico. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Para cada campo canônico, escolhe o cabeçalho mais provável.
 * Prioriza igualdade exata, depois "contém". Não reutiliza um cabeçalho já
 * atribuído a um campo de maior prioridade.
 */
export function sugerirMapeamento(headers: string[]): Record<string, string> {
  const normalizados = headers.map((h) => ({ original: h, norm: normalizar(h) }));
  const usados = new Set<string>();
  const resultado: Record<string, string> = {};

  for (const campo of CAMPOS_CANONICOS) {
    const disponiveis = normalizados.filter((h) => !usados.has(h.original));

    let escolhido =
      disponiveis.find((h) => campo.sinonimos.includes(h.norm)) ??
      disponiveis.find((h) => campo.sinonimos.some((s) => h.norm.includes(s))) ??
      disponiveis.find((h) => campo.sinonimos.some((s) => s.includes(h.norm) && h.norm.length >= 3));

    if (escolhido) {
      resultado[campo.campo] = escolhido.original;
      usados.add(escolhido.original);
    }
  }
  return resultado;
}
