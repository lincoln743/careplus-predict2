/**
 * Gerador de biometria sintetica determinístico-com-ruido.
 *
 * Cada paciente tem um perfil fixo (coerente com as telas atuais do app).
 * As curvas sao reproduziveis (mesma seed => mesmo resultado), mas com ruido
 * natural para nao parecerem roboticas. Usado SO para simulacao/demo.
 */

// PRNG deterministico (mulberry32).
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface PerfilSim {
  chave: string;
  nome: string;
  idade: number;
  perfilRisco: "saudavel" | "risco_medio" | "risco_alto";
  fcBase: number;
  passosMeta: number;
  sonoBase: number;
}

// Pacientes fixos (coerentes com as telas: Joao risco medio, Maria saudavel...).
export const PERFIS: PerfilSim[] = [
  { chave: "joao", nome: "João Silva", idade: 35, perfilRisco: "risco_medio", fcBase: 75, passosMeta: 6500, sonoBase: 5.8 },
  { chave: "maria", nome: "Maria Santos", idade: 32, perfilRisco: "saudavel", fcBase: 68, passosMeta: 11500, sonoBase: 7.2 },
  { chave: "carlos", nome: "Carlos Demo", idade: 29, perfilRisco: "saudavel", fcBase: 72, passosMeta: 7200, sonoBase: 7.5 },
];

export interface LeituraDia {
  dataRef: string; // ISO date (YYYY-MM-DD)
  passos: number;
  sonoHoras: number;
  fcMedia: number;
  fcMin: number;
  fcMax: number;
}

// FC por hora: ritmo circadiano (minimo ~4h, maximo ~16h) + ruido menor que a amplitude.
function fcPorHora(perfil: PerfilSim, rng: () => number, hora: number): number {
  const circadiano = Math.sin(((hora - 4) / 24) * 2 * Math.PI) * 10; // amplitude 10
  const ruido = (rng() - 0.5) * 4; // ruido menor que amplitude => circadiano visivel
  return Math.round(perfil.fcBase + circadiano + ruido);
}

function passosNoDia(perfil: PerfilSim, rng: () => number): number {
  const variacao = 0.8 + rng() * 0.4; // 80%–120% da meta
  return Math.round(perfil.passosMeta * variacao);
}

function sonoNoite(perfil: PerfilSim, rng: () => number): number {
  const ruido = (rng() - 0.5) * 1.2;
  return Math.round((perfil.sonoBase + ruido) * 10) / 10;
}

function dataISO(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

/** Gera a serie de N dias (mais antigo primeiro) para um paciente. */
export function gerarSerie(perfil: PerfilSim, dias = 7): LeituraDia[] {
  const serie: LeituraDia[] = [];
  for (let d = dias - 1; d >= 0; d--) {
    const seed = hashString(`${perfil.chave}_dia_${d}`);
    const rng = mulberry32(seed);
    const fcAmostras: number[] = [];
    for (let h = 0; h < 24; h++) fcAmostras.push(fcPorHora(perfil, rng, h));
    const fcMedia = Math.round(fcAmostras.reduce((a, b) => a + b, 0) / 24);
    serie.push({
      dataRef: dataISO(d),
      passos: passosNoDia(perfil, rng),
      sonoHoras: sonoNoite(perfil, rng),
      fcMedia,
      fcMin: Math.min(...fcAmostras),
      fcMax: Math.max(...fcAmostras),
    });
  }
  return serie;
}
