import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireEnv } from './env.js';

let client: SupabaseClient | null = null;

/**
 * Cliente com service_role — uso exclusivo no backend (bypassa RLS).
 * Lazy: a API sobe sem credenciais, mas qualquer rota que toque o banco
 * falha cedo e com mensagem clara se o env estiver incompleto.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (client === null) {
    client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    });
  }
  return client;
}

/**
 * O PostgREST corta cada resposta em `max_rows` (1000, ver supabase/config.toml).
 * Qualquer leitura que possa devolver mais que isso PRECISA paginar, senão os
 * dados são silenciosamente truncados.
 */
export const TAMANHO_PAGINA = 1000;

interface RespostaSupabase<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Lê uma tabela inteira página a página até esgotar, contornando `max_rows`.
 *
 * `montarQuery` recebe o intervalo [de, ate] e DEVE construir a query do zero a
 * cada chamada (incluindo `.range(de, ate)`); reaproveitar um mesmo builder do
 * supabase-js entre páginas é frágil. Exemplo:
 *
 *   const linhas = await buscarTudo((de, ate) =>
 *     supabase.from('consumo_mensal').select('*').range(de, ate));
 */
export async function buscarTudo<T>(
  montarQuery: (de: number, ate: number) => PromiseLike<RespostaSupabase<T>>,
): Promise<T[]> {
  const todas: T[] = [];
  let de = 0;
  for (;;) {
    const { data, error } = await montarQuery(de, de + TAMANHO_PAGINA - 1);
    if (error) {
      throw new Error(error.message);
    }
    const pagina = data ?? [];
    todas.push(...pagina);
    if (pagina.length < TAMANHO_PAGINA) {
      break;
    }
    de += TAMANHO_PAGINA;
  }
  return todas;
}
