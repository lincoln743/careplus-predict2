/**
 * Questionario fixo de anamnese (v1). Estrutura declarativa: o backend serve
 * este schema para o cliente renderizar, e valida as respostas contra ele.
 * Tipos de campo: 'texto', 'booleano', 'selecao' (uma opcao), 'multipla' (varias),
 * 'numero'. Campos podem ter 'depende' (mostra so se outra resposta for true).
 */
export const VERSAO_QUESTIONARIO = "v1";

export interface CampoAnamnese {
  id: string;
  rotulo: string;
  tipo: "texto" | "booleano" | "selecao" | "multipla" | "numero";
  opcoes?: string[];
  obrigatorio?: boolean;
  depende?: { campo: string; valor: boolean };
  placeholder?: string;
}

export interface SecaoAnamnese {
  id: string;
  titulo: string;
  campos: CampoAnamnese[];
}

export const QUESTIONARIO: SecaoAnamnese[] = [
  {
    id: "queixa",
    titulo: "Queixa principal",
    campos: [
      { id: "queixa_principal", rotulo: "O que motivou a busca por atendimento?", tipo: "texto", obrigatorio: true, placeholder: "Descreva o sintoma ou motivo principal" },
      { id: "inicio_sintomas", rotulo: "Há quanto tempo começou?", tipo: "selecao", opcoes: ["Hoje", "Poucos dias", "Semanas", "Meses", "Mais de um ano"] },
    ],
  },
  {
    id: "historico_medico",
    titulo: "Histórico médico",
    campos: [
      { id: "doencas_cronicas", rotulo: "Possui alguma condição crônica?", tipo: "multipla", opcoes: ["Hipertensão", "Diabetes", "Asma", "Doença cardíaca", "Doença renal", "Nenhuma"] },
      { id: "cirurgias", rotulo: "Já passou por cirurgias?", tipo: "booleano" },
      { id: "cirurgias_quais", rotulo: "Quais cirurgias?", tipo: "texto", depende: { campo: "cirurgias", valor: true } },
      { id: "internacoes", rotulo: "Já foi internado(a) no último ano?", tipo: "booleano" },
    ],
  },
  {
    id: "medicamentos",
    titulo: "Medicamentos e alergias",
    campos: [
      { id: "usa_medicamentos", rotulo: "Usa medicamentos regularmente?", tipo: "booleano" },
      { id: "medicamentos_quais", rotulo: "Quais medicamentos e doses?", tipo: "texto", depende: { campo: "usa_medicamentos", valor: true } },
      { id: "tem_alergias", rotulo: "Possui alergias?", tipo: "booleano" },
      { id: "alergias_quais", rotulo: "A que é alérgico(a)?", tipo: "texto", depende: { campo: "tem_alergias", valor: true } },
    ],
  },
  {
    id: "familiar",
    titulo: "Histórico familiar",
    campos: [
      { id: "historico_familiar", rotulo: "Há doenças na família?", tipo: "multipla", opcoes: ["Hipertensão", "Diabetes", "Câncer", "Doença cardíaca", "AVC", "Nenhuma"] },
    ],
  },
  {
    id: "habitos",
    titulo: "Hábitos de vida",
    campos: [
      { id: "tabagismo", rotulo: "Fuma?", tipo: "selecao", opcoes: ["Nunca fumei", "Ex-fumante", "Fumante"] },
      { id: "alcool", rotulo: "Consome álcool?", tipo: "selecao", opcoes: ["Não", "Socialmente", "Frequentemente"] },
      { id: "atividade_fisica", rotulo: "Pratica atividade física?", tipo: "selecao", opcoes: ["Sedentário", "1-2x por semana", "3-4x por semana", "5x ou mais"] },
      { id: "horas_sono", rotulo: "Quantas horas dorme por noite?", tipo: "numero", placeholder: "Ex: 7" },
    ],
  },
];

/** IDs validos de campos, para validar respostas recebidas. */
export const CAMPOS_VALIDOS = new Set(
  QUESTIONARIO.flatMap((s) => s.campos.map((c) => c.id)),
);
