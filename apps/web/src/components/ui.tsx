import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

/* ── Card ─────────────────────────────────────────────────────────────── */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-surface shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
      <h3 className="text-sm font-semibold text-fg">{children}</h3>
      {acao}
    </div>
  );
}

/* ── PageHeader ───────────────────────────────────────────────────────── */
export function PageHeader({
  titulo,
  subtitulo,
  acoes,
}: {
  titulo: string;
  subtitulo?: string;
  acoes?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-fg">{titulo}</h1>
        {subtitulo !== undefined && <p className="mt-0.5 text-sm text-fg-muted">{subtitulo}</p>}
      </div>
      {acoes !== undefined && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}

/* ── KpiCard ──────────────────────────────────────────────────────────── */
type Tom = 'neutro' | 'alerta' | 'positivo' | 'destaque';

const ICONE_BG: Record<Tom, string> = {
  neutro: 'bg-surface-2 text-fg-muted',
  alerta: 'bg-rose-500/15 text-rose-400',
  positivo: 'bg-emerald-500/15 text-emerald-400',
  destaque: 'bg-accent/15 text-accent',
};

const BARRA_COR: Record<Tom, string> = {
  neutro: 'bg-fg-subtle',
  alerta: 'bg-rose-400',
  positivo: 'bg-emerald-400',
  destaque: 'bg-accent',
};

export function KpiCard({
  titulo,
  valor,
  detalhe,
  icone,
  tom = 'neutro',
  tendencia,
  progresso,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icone?: IconName;
  tom?: Tom;
  tendencia?: { valor: string; subindo: boolean; bom: boolean };
  progresso?: { atual: number; total: number };
}) {
  const pct =
    progresso !== undefined && progresso.total > 0
      ? Math.min(100, Math.max(0, (progresso.atual / progresso.total) * 100))
      : null;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{titulo}</p>
        {icone !== undefined && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${ICONE_BG[tom]}`}>
            <Icon name={icone} className="h-5 w-5" />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-fg">{valor}</p>
      <div className="mt-1 flex items-center gap-2">
        {tendencia !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
              tendencia.bom ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
            }`}
          >
            <Icon name={tendencia.subindo ? 'trendingUp' : 'trendingDown'} className="h-3 w-3" />
            {tendencia.valor}
          </span>
        )}
        {detalhe !== undefined && <span className="text-xs text-fg-subtle">{detalhe}</span>}
      </div>
      {pct !== null && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <div className={`h-full rounded-full ${BARRA_COR[tom]}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </Card>
  );
}

/* ── Button ───────────────────────────────────────────────────────────── */
type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma';

const VARIANTE: Record<Variante, string> = {
  primario: 'bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50',
  secundario: 'border border-border bg-surface-2 text-fg hover:border-accent/50',
  perigo: 'bg-rose-600 text-white hover:bg-rose-500',
  fantasma: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
};

export function Button({
  variante = 'primario',
  icone,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; icone?: IconName }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTE[variante]} ${className}`}
      {...props}
    >
      {icone !== undefined && <Icon name={icone} className="h-4 w-4" />}
      {children}
    </button>
  );
}

/* ── Inputs ───────────────────────────────────────────────────────────── */
const CAMPO =
  'w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-fg-subtle';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CAMPO} ${props.className ?? ''}`} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return <select className={`${CAMPO} ${className ?? ''}`} {...rest} />;
}

export function Field({ label, children, dica }: { label: string; children: ReactNode; dica?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-fg-muted">{label}</span>
      {children}
      {dica !== undefined && <span className="mt-1 block text-xs text-fg-subtle">{dica}</span>}
    </label>
  );
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">
        <Icon name="search" className="h-4 w-4" />
      </span>
      <input className={`${CAMPO} pl-9 ${props.className ?? ''}`} {...props} />
    </div>
  );
}

/* ── Badges ───────────────────────────────────────────────────────────── */
const STATUS: Record<string, { cor: string; ponto: string }> = {
  ativo: { cor: 'bg-emerald-500/15 text-emerald-400', ponto: 'bg-emerald-500' },
  suspenso: { cor: 'bg-amber-500/15 text-amber-400', ponto: 'bg-amber-500' },
  cancelado: { cor: 'bg-surface-2 text-fg-subtle', ponto: 'bg-fg-subtle' },
  desconhecido: { cor: 'bg-surface-2 text-fg-subtle', ponto: 'bg-fg-subtle' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS['desconhecido']!;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${s.cor}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.ponto}`} />
      {status}
    </span>
  );
}

export function Pill({ children, tom = 'slate' }: { children: ReactNode; tom?: 'slate' | 'indigo' | 'rose' | 'emerald' }) {
  const cores: Record<string, string> = {
    slate: 'bg-surface-2 text-fg-muted',
    indigo: 'bg-accent/15 text-accent',
    rose: 'bg-rose-500/15 text-rose-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
  };
  return (
    <span className={`inline-block rounded-md px-1.5 py-0.5 text-xs font-medium ${cores[tom]}`}>
      {children}
    </span>
  );
}

/* ── ConnChip ─────────────────────────────────────────────────────────── */
/* Chip de status de conexão estilo inventário (ON/OFF + tecnologia/operadora). */
export function ConnChip({ online, etiqueta }: { online: boolean; etiqueta: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        online ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {etiqueta}
    </span>
  );
}

/* ── Feedback ─────────────────────────────────────────────────────────── */
export function Spinner({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-fg-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
      {texto}
    </div>
  );
}

export function Alert({ tipo, children }: { tipo: 'erro' | 'sucesso' | 'info'; children: ReactNode }) {
  const conf = {
    erro: { cor: 'bg-rose-500/10 text-rose-300 border-rose-500/30', icone: 'alert' as const },
    sucesso: { cor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', icone: 'check' as const },
    info: { cor: 'bg-accent/10 text-accent border-accent/30', icone: 'shield' as const },
  }[tipo];
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${conf.cor}`}>
      <Icon name={conf.icone} className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ titulo, descricao, icone = 'list' }: { titulo: string; descricao?: string; icone?: IconName }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
        <Icon name={icone} className="h-6 w-6" />
      </span>
      <p className="font-medium text-fg">{titulo}</p>
      {descricao !== undefined && <p className="max-w-sm text-sm text-fg-muted">{descricao}</p>}
    </div>
  );
}

/* ── Table helpers ────────────────────────────────────────────────────── */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, right = false }: { children: ReactNode; right?: boolean }) {
  return (
    <th
      className={`whitespace-nowrap border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-fg-muted ${
        right ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

export function Td({ children, right = false, className = '' }: { children: ReactNode; right?: boolean; className?: string }) {
  return (
    <td className={`whitespace-nowrap px-3 py-2.5 text-fg-muted ${right ? 'text-right' : ''} ${className}`}>
      {children}
    </td>
  );
}
