import 'dotenv/config';

export function requireEnv(nome: string): string {
  const valor = process.env[nome];
  if (valor === undefined || valor === '') {
    throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  }
  return valor;
}

export const env = {
  port: Number(process.env['PORT'] ?? 3001),
};
