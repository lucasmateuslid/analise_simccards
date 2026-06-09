/**
 * Worker de ingestão por scraping — Fase 4.
 *
 * Aqui entrarão as filas BullMQ (Redis) e os adapters Playwright, um por
 * portal de broker, com retry/backoff e fallback para upload manual.
 * Credenciais virão de env/Supabase Vault — nunca de código.
 */
console.log('Worker M2M — scraping será implementado na Fase 4.');
