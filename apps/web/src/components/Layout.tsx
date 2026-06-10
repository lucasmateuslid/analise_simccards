import { NavLink, Outlet } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const LINKS: { para: string; rotulo: string; icone: IconName; fim?: boolean }[] = [
  { para: '/', rotulo: 'Dashboard', icone: 'dashboard', fim: true },
  { para: '/linhas', rotulo: 'Linhas', icone: 'list' },
  { para: '/candidatas', rotulo: 'Candidatas a cancelar', icone: 'scissors' },
  { para: '/upload', rotulo: 'Importar planilha', icone: 'upload' },
  { para: '/fornecedores', rotulo: 'Fornecedores', icone: 'store' },
  { para: '/mapeamentos', rotulo: 'Mapeamentos', icone: 'sliders' },
];

export function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900 px-3 py-5 text-slate-300 md:flex">
        <div className="flex items-center gap-2.5 px-2 pb-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Icon name="chip" className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Consumo M2M</p>
            <p className="text-[11px] text-slate-400">Gestão de chips</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {LINKS.map((l) => (
            <NavLink
              key={l.para}
              to={l.para}
              end={l.fim}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-[inset_3px_0_0_0] shadow-indigo-500'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`
              }
            >
              <Icon name={l.icone} className="h-[18px] w-[18px]" />
              {l.rotulo}
            </NavLink>
          ))}
        </nav>

        <p className="px-3 pt-4 text-[11px] text-slate-500">Fases 0–3 · pré-scraping</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo mobile com navegação compacta */}
        <header className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          {LINKS.map((l) => (
            <NavLink
              key={l.para}
              to={l.para}
              end={l.fim}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-500'
                }`
              }
            >
              <Icon name={l.icone} className="h-4 w-4" />
              {l.rotulo}
            </NavLink>
          ))}
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
