/**
 * Cliente Supabase (service_role).
 *
 * O backend e a unica porta de entrada ao banco. Usa a service_role key, que
 * bypassa RLS — por isso este cliente NUNCA deve ser exposto ao front nem
 * usado para repassar requisicoes nao autenticadas. Toda autorizacao acontece
 * na camada de aplicacao (guards de RBAC) antes de tocar aqui.
 *
 * Nota tecnica: o supabase-js inicializa o cliente de "realtime" (WebSocket),
 * que o Node 20 nao tem nativo. Nao usamos realtime no backend, entao
 * fornecemos o pacote "ws" como transporte para satisfazer a inicializacao.
 * Em Node 22+ isso seria desnecessario.
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { env } from "./env.js";

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws as unknown as typeof WebSocket },
  },
);
