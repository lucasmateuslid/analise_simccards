/** Erro com status HTTP explícito, tratado pelo error handler central. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function badRequest(mensagem: string): HttpError {
  return new HttpError(400, mensagem);
}

export function notFound(mensagem: string): HttpError {
  return new HttpError(404, mensagem);
}
