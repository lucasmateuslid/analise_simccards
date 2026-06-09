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
