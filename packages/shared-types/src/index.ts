/**
 * Contratos compartilhados entre mobile, web e backend.
 * Fonte unica da verdade para DTOs — evita divergencia de payload.
 */

export type Perfil = "paciente" | "medico";

export type Role = "PATIENT" | "DOCTOR" | "ADMIN";

/** Intents que a IA BluaDiagnostics classifica (espelha o contrato). */
export type IntentIA =
  | "triagem"
  | "prescricao"
  | "escalada"
  | "fora_de_escopo"
  | "finalizado";

/** Red flag de emergencia (espelha RedFlagInfo da Blua). */
export interface RedFlag {
  categoria: string;
  frase_gatilho: string;
  severidade: "alta" | "critica";
  fonte_deteccao: "regra" | "llm";
}

/** Sugestao de prescricao — sempre requer revisao medica (HITL). */
export interface SugestaoPrescricao {
  tipo: "sugestao_prescricao" | "encaminhamento_teleconsulta" | "nao_prescrever";
  medicamento?: string;
  dose?: string;
  via?: string;
  frequencia?: string;
  duracao?: string;
  justificativa?: string;
  alertas?: string[];
  contraindicacoes_identificadas?: string[];
  interacoes_identificadas?: string[];
  encaminhamento?: { especialidade?: string; urgencia?: "rotina" | "prioridade" | "urgente" };
  requer_revisao_medica: true; // garantia de tipo: sempre true
}

/** Request do app -> backend (que repassa pseudonimizado a Blua). */
export interface ChatRequest {
  mensagem: string;
  thread_id?: string;
}

/** Response da IA, conforme o contrato do wrapper da Blua. */
export interface ChatResponse {
  resposta: string;
  intent: IntentIA | null;
  requer_escalada_humana: boolean;
  /** EMERGENCIA = este array nao-vazio. Nao confundir com requer_escalada_humana. */
  red_flags: RedFlag[];
  sugestao_prescricao: SugestaoPrescricao | null;
  tools_usadas: string[];
  docs_consultados: string[];
  thread_id: string;
}

/** Estados da maquina de validacao da base de conhecimento (RAG). */
export type StatusDocumento = "pendente" | "aprovado" | "rejeitado" | "revogado";
