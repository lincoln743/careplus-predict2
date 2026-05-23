/**
 * Erros de aplicacao tipados. Mapeiam para status HTTP sem vazar detalhe
 * interno ao cliente.
 */

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  unauthorized: (msg = "Nao autenticado") => new AppError(401, "UNAUTHORIZED", msg),
  forbidden: (msg = "Sem permissao") => new AppError(403, "FORBIDDEN", msg),
  badRequest: (msg = "Requisicao invalida") => new AppError(400, "BAD_REQUEST", msg),
  conflict: (msg = "Conflito") => new AppError(409, "CONFLICT", msg),
  notFound: (msg = "Nao encontrado") => new AppError(404, "NOT_FOUND", msg),
};
