import { NavLink, Outlet } from 'react-router-dom';

const LINKS = [
  { para: '/', rotulo: 'Dashboard', fim: true },
  { para: '/candidatas', rotulo: 'Candidatas a cancelar', fim: false },
  { para: '/upload', rotulo: 'Importar planilha', fim: false },
  { para: '/mapeamentos', rotulo: 'Mapeamentos', fim: false },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Gestão de Consumo M2M</h1>
            <p className="text-sm text-slate-400">Consolidação multi-broker · custos · ociosidade</p>
          </div>
          <nav className="flex gap-1">
            {LINKS.map((l) => (
              <NavLink
                key={l.para}
                to={l.para}
                end={l.fim}
                className={({ isActive }) =>
                  `rounded px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-700'
                  }`
                }
              >
                {l.rotulo}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
