import type { Centavos, Lancamento, Participacao } from "./tipos";

export const caixa = (lancamentos: Lancamento[]): Centavos =>
  lancamentos.reduce((s, l) => s + l.valor, 0);

export const arrecadado = (participacoes: Participacao[]): Centavos =>
  participacoes.reduce((s, p) => s + p.valorPago, 0);

/**
 * Comissão arredondada para baixo, de propósito: o centavo da divisão fica com
 * os apostadores, não com a casa. É uma escolha, não um acidente, e é a escolha
 * que não precisa ser explicada para ninguém depois.
 */
export const comissaoDe = (total: Centavos, pct: number): Centavos =>
  Math.floor((total * pct) / 100);

export interface Rateio {
  usuarioId: string;
  valor: Centavos;
  /** Quem recebeu o centavo que sobrou da divisão. */
  centavoExtra: boolean;
}

/**
 * Divide o prêmio entre os vencedores sem perder nem inventar um centavo.
 *
 * Três pessoas dividindo R$ 100,00 recebem 33,34 / 33,33 / 33,33, e não
 * 33,33 cada com um centavo evaporando no arredondamento. A sobra vai para
 * quem entrou primeiro no bolão, que é um critério que dá para escrever no
 * regulamento e que qualquer um pode conferir.
 */
export function ratear(premio: Centavos, vencedoresOrdenados: string[]): Rateio[] {
  const n = vencedoresOrdenados.length;
  if (n === 0 || premio <= 0) return [];
  const base = Math.floor(premio / n);
  const sobra = premio - base * n;
  return vencedoresOrdenados.map((usuarioId, i) => ({
    usuarioId,
    valor: base + (i < sobra ? 1 : 0),
    centavoExtra: i < sobra,
  }));
}

export interface Resumo {
  arrecadado: Centavos;
  comissao: Centavos;
  premio: Centavos;
  pago: Centavos;
  estornado: Centavos;
  retido: Centavos;
}

export function resumo(lancamentos: Lancamento[]): Resumo {
  const soma = (tipo: Lancamento["tipo"]) =>
    lancamentos.filter((l) => l.tipo === tipo).reduce((s, l) => s + l.valor, 0);
  return {
    arrecadado: soma("entrada"),
    comissao: -soma("comissao"),
    premio: -soma("premio"),
    pago: -soma("premio"),
    estornado: -soma("estorno"),
    retido: caixa(lancamentos),
  };
}
