import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Icon } from './components/Icon';

type Tema = 'dark' | 'light';
const CHAVE = 'm2m-theme';

function temaInicial(): Tema {
  if (typeof localStorage !== 'undefined') {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === 'dark' || salvo === 'light') {
      return salvo;
    }
  }
  return 'dark'; // default escuro
}

const TemaContext = createContext<{ tema: Tema; alternar: () => void }>({
  tema: 'dark',
  alternar: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    localStorage.setItem(CHAVE, tema);
  }, [tema]);

  const alternar = () => setTema((t) => (t === 'dark' ? 'light' : 'dark'));

  return <TemaContext.Provider value={{ tema, alternar }}>{children}</TemaContext.Provider>;
}

export function useTheme() {
  return useContext(TemaContext);
}

export function ThemeToggle() {
  const { tema, alternar } = useTheme();
  const escuro = tema === 'dark';
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={escuro ? 'Tema claro' : 'Tema escuro'}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg-muted transition hover:text-fg hover:border-accent/50"
    >
      <Icon name={escuro ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
    </button>
  );
}
