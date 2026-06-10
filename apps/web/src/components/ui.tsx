import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg bg-white shadow ${className}`}>{children}</div>;
}

export function KpiCard({
  titulo,
  valor,
  detalhe,
  tom = 'neutro',
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  tom?: 'neutro' | 'alerta' | 'positivo';
}) {
  const cor =
    tom === 'alerta' ? 'text-rose-600' : tom === 'positivo' ? 'text-emerald-600' : 'text-slate-900';
  return (
    <Card className="p-4">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${cor}`}>{valor}</p>
      {detalhe !== undefined && <p className="mt-1 text-xs text-slate-400">{detalhe}</p>}
    </Card>
  );
}

const CLASSES_STATUS: Record<string, string> = {
  ativo: 'bg-emerald-100 text-emerald-700',
  suspenso: 'bg-amber-100 text-amber-700',
  cancelado: 'bg-slate-200 text-slate-600',
  desconhecido: 'bg-slate-100 text-slate-500',
};

export function StatusBadge({ status }: { status: string }) {
  const classe = CLASSES_STATUS[status] ?? CLASSES_STATUS['desconhecido'];
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${classe}`}>{status}</span>
  );
}

export function Spinner({ texto = 'Carregando…' }: { texto?: string }) {
  return <p className="py-8 text-center text-slate-400">{texto}</p>;
}

export function Alerta({ tipo, children }: { tipo: 'erro' | 'sucesso' | 'info'; children: ReactNode }) {
  const cor =
    tipo === 'erro'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : tipo === 'sucesso'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-sky-50 text-sky-700 border-sky-200';
  return <div className={`rounded border px-4 py-3 text-sm ${cor}`}>{children}</div>;
}
