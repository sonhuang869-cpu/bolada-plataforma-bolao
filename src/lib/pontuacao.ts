import type { Palpite, Partida } from "./tipos";

export const PONTOS = {
  exato: 10,
  vencedorESaldo: 7,
  vencedor: 5,
  umPlacar: 2,
  nada: 0,
} as const;

export const REGRAS: { pontos: number; texto: string }[] = [
  { pontos: PONTOS.exato, texto: "Acertou o placar exato" },
  { pontos: PONTOS.vencedorESaldo, texto: "Acertou quem ganhou e por quantos gols" },
  { pontos: PONTOS.vencedor, texto: "Acertou só quem ganhou" },
  { pontos: PONTOS.umPlacar, texto: "Errou o resultado mas acertou os gols de um dos times" },
  { pontos: PONTOS.nada, texto: "Não acertou nada" },
];

const sinal = (a: number, b: number): -1 | 0 | 1 => (a > b ? 1 : a < b ? -1 : 0);

/**
 * As regras são excludentes e avaliadas nesta ordem. Sem a ordem explícita,
 * um palpite de empate num jogo empatado se encaixa em duas regras ao mesmo
 * tempo, e qual delas vale passa a depender de como o `if` foi escrito.
 */
export function pontosDoPalpite(p: Palpite, partida: Partida): number {
  if (partida.placarMandante === null || partida.placarVisitante === null) return 0;
  const rm = partida.placarMandante;
  const rv = partida.placarVisitante;

  if (p.mandante === rm && p.visitante === rv) return PONTOS.exato;

  const acertouResultado = sinal(p.mandante, p.visitante) === sinal(rm, rv);
  if (acertouResultado && p.mandante - p.visitante === rm - rv) return PONTOS.vencedorESaldo;
  if (acertouResultado) return PONTOS.vencedor;
  if (p.mandante === rm || p.visitante === rv) return PONTOS.umPlacar;
  return PONTOS.nada;
}

export interface LinhaRanking {
  usuarioId: string;
  pontos: number;
  exatos: number;
  palpites: number;
  posicao: number;
}

/**
 * Classificação do bolão. Empate em pontos é empate de verdade: as duas pessoas
 * ficam na mesma posição e a seguinte pula. Desempatar por critério escondido
 * seria a forma mais rápida de alguém perder dinheiro sem entender por quê.
 */
export function ranking(
  palpites: Palpite[],
  partidas: Partida[],
  participantes: string[],
): LinhaRanking[] {
  const porId = new Map(partidas.map((p) => [p.id, p]));

  const linhas = participantes.map((usuarioId) => {
    const meus = palpites.filter((p) => p.usuarioId === usuarioId);
    let pontos = 0;
    let exatos = 0;
    for (const p of meus) {
      const partida = porId.get(p.partidaId);
      if (!partida || partida.status !== "encerrada") continue;
      const ganhos = pontosDoPalpite(p, partida);
      pontos += ganhos;
      if (ganhos === PONTOS.exato) exatos++;
    }
    return { usuarioId, pontos, exatos, palpites: meus.length, posicao: 0 };
  });

  linhas.sort((a, b) => b.pontos - a.pontos || b.exatos - a.exatos || a.usuarioId.localeCompare(b.usuarioId));

  let posicao = 0;
  let anterior: { pontos: number; exatos: number } | null = null;
  linhas.forEach((l, i) => {
    if (!anterior || l.pontos !== anterior.pontos || l.exatos !== anterior.exatos) posicao = i + 1;
    l.posicao = posicao;
    anterior = { pontos: l.pontos, exatos: l.exatos };
  });

  return linhas;
}

/** Quem leva. Ninguém pontuou é caso à parte, e não "todo mundo ganhou". */
export function vencedores(linhas: LinhaRanking[]): string[] {
  if (!linhas.length) return [];
  const topo = linhas[0].pontos;
  if (topo <= 0) return [];
  return linhas.filter((l) => l.pontos === topo).map((l) => l.usuarioId);
}
