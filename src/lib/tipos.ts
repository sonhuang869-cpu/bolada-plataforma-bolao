/**
 * Todo valor neste sistema é inteiro, em centavos.
 *
 * Não existe `number` representando reais em lugar nenhum. Um bolão guarda
 * dinheiro de terceiros até o fim da partida: se 0,1 + 0,2 der 0,30000000000000004
 * uma vez, o caixa não fecha e ninguém descobre qual aposta quebrou.
 */
export type Centavos = number;

export type Papel = "apostador" | "dono" | "admin";
export type Esporte = "futebol" | "volei";

/**
 * "Fechado" não é um estado guardado: é o relógio. Guardar isso num campo
 * significaria depender de alguém passar e atualizar, e apostas continuariam
 * abertas depois do apito enquanto ninguém passasse.
 */
export type StatusBolao = "rascunho" | "aberto" | "liquidado" | "cancelado";
export type StatusPartida = "agendada" | "encerrada";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha: string;
  papel: Papel;
  ativo: boolean;
  criadoEm: string;
}

export interface Bolao {
  id: string;
  nome: string;
  esporte: Esporte;
  donoId: string;
  valorCota: Centavos;
  /** Percentual inteiro. Fracionado vira discussão sobre arredondar comissão. */
  comissaoPct: number;
  codigoConvite: string;
  status: StatusBolao;
  /** Trava das apostas. Nunca pode ser depois do início da primeira partida. */
  fechaEm: string;
  criadoEm: string;
}

export interface Partida {
  id: string;
  bolaoId: string;
  mandante: string;
  visitante: string;
  inicioEm: string;
  placarMandante: number | null;
  placarVisitante: number | null;
  status: StatusPartida;
}

export interface Palpite {
  id: string;
  bolaoId: string;
  partidaId: string;
  usuarioId: string;
  mandante: number;
  visitante: number;
  criadoEm: string;
}

export interface Participacao {
  id: string;
  bolaoId: string;
  usuarioId: string;
  valorPago: Centavos;
  pagoEm: string;
}

export type TipoLancamento = "entrada" | "comissao" | "premio" | "estorno";

/**
 * O extrato do bolão. Positivo entra no caixa, negativo sai.
 * A soma de tudo é o que está retido; depois de liquidar ou cancelar, é zero.
 */
export interface Lancamento {
  id: string;
  bolaoId: string;
  tipo: TipoLancamento;
  usuarioId: string | null;
  valor: Centavos;
  descricao: string;
  criadoEm: string;
}

export interface Dados {
  usuarios: Usuario[];
  boloes: Bolao[];
  partidas: Partida[];
  palpites: Palpite[];
  participacoes: Participacao[];
  lancamentos: Lancamento[];
  sessaoId: string | null;
}

export const ROTULO_STATUS: Record<StatusBolao, string> = {
  rascunho: "rascunho",
  aberto: "aberto",
  liquidado: "liquidado",
  cancelado: "cancelado",
};

/** Dá para apostar? É a pergunta que o produto inteiro gira em volta. */
export const apostasAbertas = (b: Bolao, agora = Date.now()): boolean =>
  b.status === "aberto" && agora < new Date(b.fechaEm).getTime();

export const rotuloSituacao = (b: Bolao, agora = Date.now()): string =>
  b.status === "aberto" && !apostasAbertas(b, agora) ? "fechado" : ROTULO_STATUS[b.status];

export const ROTULO_ESPORTE: Record<Esporte, string> = {
  futebol: "futebol",
  volei: "vôlei",
};

export const ROTULO_PAPEL: Record<Papel, string> = {
  apostador: "apostador",
  dono: "dono de bolão",
  admin: "administrador",
};

/**
 * Centavos para texto. A única conversão para real que existe no sistema.
 * O `|| 0` existe por causa do zero negativo: somar lançamentos que se anulam
 * produz -0, e o formatador imprime "-R$ 0,00", que num extrato parece erro.
 */
export const brl = (c: Centavos): string =>
  ((c || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const data = (iso: string): string =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const dataHora = (iso: string): string =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export const hora = (iso: string): string =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function faltam(iso: string, agora = Date.now()): string {
  const ms = new Date(iso).getTime() - agora;
  if (ms <= 0) return "encerrado";
  const min = Math.round(ms / 60000);
  if (min < 60) return `em ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `em ${h} h`;
  return `em ${Math.floor(h / 24)} d`;
}
