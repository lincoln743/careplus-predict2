/**
 * Carregamento e validacao de variaveis de ambiente.
 *
 * Principio: SEM fallback silencioso. Se uma variavel critica falta, o servidor
 * NAO sobe — falha alto e claro. Nada de "se nao tiver, usa localhost".
 */
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),

  PORT: z.coerce.number().optional(),        // Railway/nuvem injeta esta
  API_PORT: z.coerce.number().default(3000), // fallback local
  API_BASE_URL: z.string().url(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY ausente"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET muito curto/ausente"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET muito curto/ausente"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  // IA — usada pelo ai-gateway:
  BLUA_API_URL: z.string().url().optional(),
  // Timeout generoso: prescricao encadeia varias tools + RAG.
  BLUA_API_TIMEOUT_MS: z.coerce.number().default(90000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuracao de ambiente invalida:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
