const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function formatBRL(valor: number): string {
  return brl.format(valor);
}

export function formatMb(mb: number): string {
  if (mb >= 1024) {
    return `${num.format(mb / 1024)} GB`;
  }
  return `${num.format(mb)} MB`;
}

export function formatNum(n: number): string {
  return num.format(n);
}

export function formatData(iso: string | null): string {
  if (iso === null) {
    return '—';
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}

export function formatPct(pct: number | null): string {
  if (pct === null) {
    return '—';
  }
  const sinal = pct > 0 ? '+' : '';
  return `${sinal}${num.format(pct)}%`;
}
