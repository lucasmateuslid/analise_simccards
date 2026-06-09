const KPIS_PLACEHOLDER = [
  { titulo: 'Custo total mensal', valor: '—' },
  { titulo: 'Custo desperdiçado', valor: '—' },
  { titulo: 'Candidatas a cancelar', valor: '—' },
  { titulo: 'Economia potencial/mês', valor: '—' },
];

export function App() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-900 px-6 py-4 text-white">
        <h1 className="text-xl font-semibold">Gestão de Consumo M2M</h1>
        <p className="text-sm text-slate-400">
          Consolidação multi-broker · custos · linhas ociosas
        </p>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS_PLACEHOLDER.map((kpi) => (
            <div key={kpi.titulo} className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-slate-500">{kpi.titulo}</p>
              <p className="mt-1 text-2xl font-bold">{kpi.valor}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
          Dashboard em construção — dados chegam na Fase 2 (analytics).
        </div>
      </main>
    </div>
  );
}
