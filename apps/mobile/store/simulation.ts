/**
 * Motor de simulacao (Zustand) — fonte UNICA de dados interligados para a demo.
 *
 * Quando ligado, gera dados realistas e os atualiza a cada 5s com pequenas
 * variacoes (como se viessem do smartwatch em tempo real). Todas as telas
 * (Home, Meus Dados, Metricas) leem daqui, entao tudo se move junto e coerente.
 *
 * Desligado: as telas usam os dados do backend real (modo normal).
 */
import { create } from "zustand";

export interface DiaPassos {
  dia: string;   // "Seg", "Ter"...
  data: string;  // "20/05"
  passos: number;
  sono: number;  // horas
}

export interface PacienteSim {
  id: string;
  nome: string;
  idade: number;
  status: "acompanhamento" | "alto_risco" | "com_alertas" | "inativo";
  score: number;
  passos: number;
  sono: number;
  fc: number;
}

export interface SimData {
  // Tempo real (pulsam a cada 5s)
  score: number;
  fcMedia: number;
  passosHoje: number;
  sonoHoje: number;
  progresso: number;
  // Historico semanal (base estavel + leve variacao)
  semana: DiaPassos[];
  // Derivados (interligados — calculados da semana)
  mediaDiaria: number;
  maximo: number;
  minimo: number;
  totalSemanal: number;
  pacientes: PacienteSim[];
  atualizadoEm: number;
}

interface SimState {
  ativo: boolean;
  data: SimData;
  _timer: ReturnType<typeof setInterval> | null;
  toggle: () => void;
  ligar: () => void;
  desligar: () => void;
}

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function dataLabel(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Variacao pequena em torno de um valor base (ruido realista).
function jitter(base: number, pct: number): number {
  const delta = base * pct * (Math.random() - 0.5) * 2;
  return base + delta;
}

// Gera a semana base (interligada — a Home e as Metricas derivam disso).
function gerarSemana(): DiaPassos[] {
  const basePassos = [7203, 6800, 5400, 9412, 7200, 8100, 6500];
  const baseSono = [7.2, 7.0, 6.9, 7.5, 7.3, 7.1, 7.4];
  return DIAS.map((dia, i) => ({
    dia,
    data: dataLabel(6 - i),
    passos: Math.round(jitter(basePassos[i], 0.04)),
    sono: Math.round(jitter(baseSono[i], 0.03) * 10) / 10,
  }));
}

function calcular(semana: DiaPassos[]): Omit<SimData, "pacientes"> {
  const passos = semana.map((d) => d.passos);
  const total = passos.reduce((a, b) => a + b, 0);
  const media = Math.round(total / passos.length);
  const max = Math.max(...passos);
  const min = Math.min(...passos);
  const passosHoje = semana[semana.length - 1].passos;
  const sonoHoje = semana[semana.length - 1].sono;
  // Score derivado dos dados (interligado): mais passos + sono bom = score maior.
  const score = Math.min(100, Math.round((media / 10000) * 60 + (sonoHoje / 8) * 40));
  const progresso = Math.min(100, Math.round((passosHoje / 10000) * 100));
  return {
    score,
    fcMedia: Math.round(jitter(74, 0.08)),
    passosHoje,
    sonoHoje,
    progresso,
    semana,
    mediaDiaria: media,
    maximo: max,
    minimo: min,
    totalSemanal: total,
    atualizadoEm: Date.now(),
  };
}

// 3 pacientes com perfis fixos; os numeros pulsam a cada tick (5s).
function gerarPacientes(): PacienteSim[] {
  const perfis: Array<{ id: string; nome: string; idade: number; status: PacienteSim["status"]; baseScore: number; basePassos: number; baseSono: number; baseFc: number }> = [
    { id: "p1", nome: "João Silva", idade: 35, status: "acompanhamento", baseScore: 72, basePassos: 6500, baseSono: 5.8, baseFc: 75 },
    { id: "p2", nome: "Maria Santos", idade: 32, status: "acompanhamento", baseScore: 94, basePassos: 11500, baseSono: 7.2, baseFc: 68 },
    { id: "p3", nome: "Carlos Souza", idade: 58, status: "alto_risco", baseScore: 48, basePassos: 3200, baseSono: 5.1, baseFc: 88 },
  ];
  return perfis.map((p) => ({
    id: p.id, nome: p.nome, idade: p.idade, status: p.status,
    score: Math.round(jitter(p.baseScore, 0.05)),
    passos: Math.round(jitter(p.basePassos, 0.06)),
    sono: Math.round(jitter(p.baseSono, 0.04) * 10) / 10,
    fc: Math.round(jitter(p.baseFc, 0.05)),
  }));
}

function snapshot(): SimData {
  const base = calcular(gerarSemana());
  return { ...base, pacientes: gerarPacientes() };
}

export const useSimulation = create<SimState>((set, get) => ({
  ativo: false,
  data: snapshot(),
  _timer: null,

  toggle: () => (get().ativo ? get().desligar() : get().ligar()),

  ligar: () => {
    if (get()._timer) return;
    // Atualiza imediatamente e depois a cada 5s.
    set({ ativo: true, data: snapshot() });
    const timer = setInterval(() => {
      set({ data: snapshot() });
    }, 5000);
    set({ _timer: timer });
  },

  desligar: () => {
    const t = get()._timer;
    if (t) clearInterval(t);
    set({ ativo: false, _timer: null });
  },
}));
