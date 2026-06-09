/**
 * Resultado de operações de parsing/normalização.
 *
 * Erros de dados de entrada são valores, não exceptions: uma linha inválida
 * numa planilha não pode derrubar a ingestão inteira — ela vira um registro
 * de erro em `ingestoes`.
 */
export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string };

export function ok<T>(valor: T): Resultado<T> {
  return { ok: true, valor };
}

export function falha<T = never>(erro: string): Resultado<T> {
  return { ok: false, erro };
}
