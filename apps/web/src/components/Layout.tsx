import { NavLink, Outlet } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { ThemeToggle } from '../theme';

type Link = { para: string; rotulo: string; icone: IconName; fim?: boolean };

const SECOES: { titulo: string; links: Link[] }[] = [
  {
    titulo: 'Principal',
    links: [
      { para: '/', rotulo: 'Dashboard', icone: 'dashboard', fim: true },
      { para: '/linhas', rotulo: 'Linhas', icone: 'list' },
    ],
  },
  {
    titulo: 'Operação',
    links: [
      { para: '/candidatas', rotulo: 'Candidatas a cancelar', icone: 'scissors' },
      { para: '/upload', rotulo: 'Importar planilha', icone: 'upload' },
      { para: '/fornecedores', rotulo: 'Fornecedores', icone: 'store' },
      { para: '/mapeamentos', rotulo: 'Mapeamentos', icone: 'sliders' },
    ],
  },
];

const TODOS = SECOES.flatMap((s) => s.links);

export function Layout() {
  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-5 md:flex">
        <div className="flex items-center gap-2.5 px-2 pb-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <Icon name="chip" className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-fg">Consumo M2M</p>
            <p className="text-[11px] text-fg-subtle">Gestão de chips</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-5">
          {SECOES.map((secao) => (
            <div key={secao.titulo} className="flex flex-col gap-0.5">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                {secao.titulo}
              </p>
              {secao.links.map((l) => (
                <NavLink
                  key={l.para}
                  to={l.para}
                  end={l.fim}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-surface-2 text-fg shadow-[inset_3px_0_0_0] shadow-accent'
                        : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                    }`
                  }
                >
                  <Icon name={l.icone} className="h-[18px] w-[18px]" />
                  {l.rotulo}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <p className="px-3 pt-4 text-[11px] text-fg-subtle">Fases 0–3</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header superior: marca compacta (mobile) + toggle de tema */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 py-2.5 backdrop-blur">
          <div className="flex items-center gap-2 md:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-fg">
              <Icon name="chip" className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-fg">Consumo M2M</span>
          </div>
          <p className="hidden text-xs text-fg-subtle md:block">Gestão de chips M2M · multi-operadora</p>
          <ThemeToggle />
        </header>

        {/* Navegação compacta no mobile */}
        <nav className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 md:hidden">
          {TODOS.map((l) => (
            <NavLink
              key={l.para}
              to={l.para}
              end={l.fim}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  isActive ? 'bg-accent text-accent-fg' : 'text-fg-muted'
                }`
              }
            >
              <Icon name={l.icone} className="h-4 w-4" />
              {l.rotulo}
            </NavLink>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
