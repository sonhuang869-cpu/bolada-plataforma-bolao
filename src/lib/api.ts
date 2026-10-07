import { arrecadado, comissaoDe, ratear } from "./dinheiro";
import { ranking, vencedores } from "./pontuacao";
import { semear } from "./seed";
import {
  apostasAbertas,
  type Bolao, type Centavos, type Dados, type Esporte, type Lancamento,
  type Palpite, type Participacao, type Partida, type Usuario,
} from "./tipos";

const CHAVE = "bolao:dados:v1";

const espera = (min = 200, max = 600) =>
  new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min)));

function ler(): Dados {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) return JSON.parse(bruto) as Dados;
  } catch {
    /* armazenamento bloqueado ou corrompido: recomeça do zero */
  }
  const novo = semear();
  gravar(novo);
  return novo;
}

function gravar(d: Dados): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(d));
  } catch {
    /* sem espaço ou aba anônima: a sessão segue em memória */
  }
}

let seq = 0;
const novoId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export class RegraError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "RegraError";
  }
}

export async function obterDados(): Promise<Dados> {
  await espera(150, 350);
  return ler();
}

// ---------------------------------------------------------------- sessão

export async function entrar(email: string, senha: string): Promise<Usuario> {
  await espera();
  const d = ler();
  const u = d.usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u || u.senha !== senha) throw new RegraError("E-mail ou senha não conferem.");
  // O enunciado é explícito: só entra quem tem cadastro ativo.
  if (!u.ativo) throw new RegraError("Esta conta está inativa. Procure o administrador.");
  d.sessaoId = u.id;
  gravar(d);
  return u;
}

export async function sair(): Promise<void> {
  const d = ler();
  d.sessaoId = null;
  gravar(d);
  await espera(100, 200);
}

export async function criarConta(nome: string, email: string, senha: string): Promise<Usuario> {
  await espera();
  const d = ler();
  const limpo = email.trim().toLowerCase();
  if (d.usuarios.some((u) => u.email.toLowerCase() === limpo))
    throw new RegraError("Já existe uma conta com este e-mail.");
  const u: Usuario = {
    id: novoId("u"), nome: nome.trim(), email: limpo, senha,
    papel: "apostador", ativo: true, criadoEm: new Date().toISOString(),
  };
  d.usuarios.push(u);
  d.sessaoId = u.id;
  gravar(d);
  return u;
}

export async function definirAtivo(usuarioId: string, ativo: boolean): Promise<Dados> {
  await espera(150, 300);
  const d = ler();
  const u = d.usuarios.find((x) => x.id === usuarioId);
  if (!u) throw new RegraError("Usuário não encontrado.");
  if (u.papel === "admin" && !ativo) throw new RegraError("O administrador não pode se desativar.");
  u.ativo = ativo;
  if (!ativo && d.sessaoId === usuarioId) d.sessaoId = null;
  gravar(d);
  return d;
}

// ---------------------------------------------------------------- bolões

export interface NovoBolao {
  nome: string;
  esporte: Esporte;
  valorCota: Centavos;
  comissaoPct: number;
  partidas: { mandante: string; visitante: string; inicioEm: string }[];
}

const codigo = (nome: string) =>
  nome.toUpperCase().normalize("NFD").replace(/[^A-Z0-9]/g, "").slice(0, 7) +
  Math.floor(Math.random() * 90 + 10);

export async function criarBolao(dono: string, novo: NovoBolao): Promise<Bolao> {
  await espera();
  if (!novo.nome.trim()) throw new RegraError("O bolão precisa de um nome.");
  if (novo.valorCota < 100) throw new RegraError("A cota mínima é R$ 1,00.");
  if (novo.comissaoPct < 0 || novo.comissaoPct > 30)
    throw new RegraError("A comissão tem que ficar entre 0% e 30%.");
  if (novo.partidas.length === 0) throw new RegraError("Inclua pelo menos uma partida.");

  const d = ler();
  const bolao: Bolao = {
    id: novoId("b"),
    nome: novo.nome.trim(),
    esporte: novo.esporte,
    donoId: dono,
    valorCota: novo.valorCota,
    comissaoPct: novo.comissaoPct,
    codigoConvite: codigo(novo.nome),
    status: "rascunho",
    // A trava nasce colada no apito inicial da primeira partida. Deixar o dono
    // escolher uma data depois disso seria permitir aposta com o jogo rolando.
    fechaEm: novo.partidas.map((p) => p.inicioEm).sort()[0],
    criadoEm: new Date().toISOString(),
  };
  d.boloes.push(bolao);
  for (const p of novo.partidas) {
    d.partidas.push({
      id: novoId("m"), bolaoId: bolao.id,
      mandante: p.mandante.trim(), visitante: p.visitante.trim(),
      inicioEm: p.inicioEm, placarMandante: null, placarVisitante: null, status: "agendada",
    });
  }
  gravar(d);
  return bolao;
}

export async function publicar(bolaoId: string): Promise<Dados> {
  await espera();
  const d = ler();
  const b = achar(d, bolaoId);
  if (b.status !== "rascunho") throw new RegraError("Este bolão já foi publicado.");
  if (new Date(b.fechaEm).getTime() <= Date.now())
    throw new RegraError("A primeira partida já começou. Não dá para abrir apostas agora.");
  b.status = "aberto";
  gravar(d);
  return d;
}

export async function entrarNoBolao(codigoConvite: string, usuarioId: string): Promise<Bolao> {
  await espera();
  const d = ler();
  const b = d.boloes.find((x) => x.codigoConvite.toLowerCase() === codigoConvite.trim().toLowerCase());
  if (!b) throw new RegraError("Convite inválido.");
  if (b.status === "rascunho") throw new RegraError("Este bolão ainda não foi aberto pelo dono.");
  if (!apostasAbertas(b)) throw new RegraError("As apostas deste bolão já estão fechadas.");
  if (d.participacoes.some((p) => p.bolaoId === b.id && p.usuarioId === usuarioId))
    throw new RegraError("Você já está neste bolão.");

  const agora = new Date().toISOString();
  d.participacoes.push({
    id: novoId("p"), bolaoId: b.id, usuarioId, valorPago: b.valorCota, pagoEm: agora,
  });
  d.lancamentos.push({
    id: novoId("l"), bolaoId: b.id, tipo: "entrada", usuarioId,
    valor: b.valorCota, descricao: "Cota recebida", criadoEm: agora,
  });
  gravar(d);
  return b;
}

// ---------------------------------------------------------------- palpites

export async function salvarPalpite(
  bolaoId: string, partidaId: string, usuarioId: string, mandante: number, visitante: number,
): Promise<Palpite> {
  await espera(150, 400);
  const d = ler();
  const b = achar(d, bolaoId);
  if (!d.participacoes.some((p) => p.bolaoId === bolaoId && p.usuarioId === usuarioId))
    throw new RegraError("Você não está neste bolão.");
  if (!apostasAbertas(b)) throw new RegraError("As apostas estão fechadas.");

  const partida = d.partidas.find((p) => p.id === partidaId);
  if (!partida) throw new RegraError("Partida não encontrada.");
  // A trava do bolão e o apito de cada partida são duas coisas: num bolão com
  // jogos em dias diferentes, a segunda ainda não começou quando a primeira sim.
  if (new Date(partida.inicioEm).getTime() <= Date.now())
    throw new RegraError("Esta partida já começou.");
  if (!Number.isInteger(mandante) || !Number.isInteger(visitante) || mandante < 0 || visitante < 0)
    throw new RegraError("Placar inválido.");

  const existente = d.palpites.find(
    (p) => p.partidaId === partidaId && p.usuarioId === usuarioId,
  );
  if (existente) {
    existente.mandante = mandante;
    existente.visitante = visitante;
    existente.criadoEm = new Date().toISOString();
    gravar(d);
    return existente;
  }
  const novo: Palpite = {
    id: novoId("g"), bolaoId, partidaId, usuarioId, mandante, visitante,
    criadoEm: new Date().toISOString(),
  };
  d.palpites.push(novo);
  gravar(d);
  return novo;
}

export async function lancarPlacar(partidaId: string, mandante: number, visitante: number): Promise<Dados> {
  await espera();
  const d = ler();
  const partida = d.partidas.find((p) => p.id === partidaId);
  if (!partida) throw new RegraError("Partida não encontrada.");
  const b = achar(d, partida.bolaoId);
  if (b.status === "liquidado") throw new RegraError("Este bolão já foi liquidado.");
  if (new Date(partida.inicioEm).getTime() > Date.now())
    throw new RegraError("Esta partida ainda não começou.");
  if (mandante < 0 || visitante < 0) throw new RegraError("Placar inválido.");
  partida.placarMandante = mandante;
  partida.placarVisitante = visitante;
  partida.status = "encerrada";
  gravar(d);
  return d;
}

// ---------------------------------------------------------------- caixa

export interface Liquidacao {
  arrecadado: Centavos;
  comissao: Centavos;
  premio: Centavos;
  partes: { usuarioId: string; valor: Centavos; centavoExtra: boolean }[];
  semVencedor: boolean;
}

/**
 * Prévia da liquidação, com as mesmas funções que a liquidação de verdade usa.
 * Existe para que o dono veja a conta antes de apertar o botão, e não depois.
 */
export function previa(d: Dados, bolaoId: string): Liquidacao {
  const b = achar(d, bolaoId);
  const participantes = d.participacoes.filter((p) => p.bolaoId === bolaoId);
  const total = arrecadado(participantes);
  const classificacao = ranking(
    d.palpites.filter((p) => p.bolaoId === bolaoId),
    d.partidas.filter((p) => p.bolaoId === bolaoId),
    participantes.map((p) => p.usuarioId),
  );
  const ganhadores = vencedores(classificacao);

  // Ninguém pontuou não é "todo mundo ganhou": é bolão sem resultado, e aí o
  // dinheiro volta inteiro, sem comissão. Cobrar taxa de um bolão que não
  // premiou ninguém é o tipo de coisa que destrói a confiança na plataforma.
  if (ganhadores.length === 0)
    return { arrecadado: total, comissao: 0, premio: 0, partes: [], semVencedor: true };

  const comissao = comissaoDe(total, b.comissaoPct);
  const ordem = participantes
    .filter((p) => ganhadores.includes(p.usuarioId))
    .sort((a, c) => a.pagoEm.localeCompare(c.pagoEm))
    .map((p) => p.usuarioId);
  return {
    arrecadado: total, comissao, premio: total - comissao,
    partes: ratear(total - comissao, ordem), semVencedor: false,
  };
}

export async function liquidar(bolaoId: string): Promise<Dados> {
  await espera(400, 800);
  const d = ler();
  const b = achar(d, bolaoId);
  if (b.status !== "aberto") throw new RegraError("Só dá para liquidar um bolão aberto.");
  const minhas = d.partidas.filter((p) => p.bolaoId === bolaoId);
  if (minhas.some((p) => p.status !== "encerrada"))
    throw new RegraError("Ainda há partida sem placar lançado.");

  const agora = new Date().toISOString();
  const conta = previa(d, bolaoId);

  if (conta.semVencedor) {
    for (const p of d.participacoes.filter((x) => x.bolaoId === bolaoId)) {
      d.lancamentos.push({
        id: novoId("l"), bolaoId, tipo: "estorno", usuarioId: p.usuarioId,
        valor: -p.valorPago, descricao: "Devolução: ninguém pontuou", criadoEm: agora,
      });
    }
  } else {
    d.lancamentos.push({
      id: novoId("l"), bolaoId, tipo: "comissao", usuarioId: null,
      valor: -conta.comissao, descricao: `Comissão da plataforma (${b.comissaoPct}%)`, criadoEm: agora,
    });
    for (const parte of conta.partes) {
      d.lancamentos.push({
        id: novoId("l"), bolaoId, tipo: "premio", usuarioId: parte.usuarioId,
        valor: -parte.valor,
        descricao: parte.centavoExtra ? "Prêmio, com o centavo da divisão" : "Prêmio",
        criadoEm: agora,
      });
    }
  }

  b.status = "liquidado";
  gravar(d);
  return d;
}

export async function cancelar(bolaoId: string): Promise<Dados> {
  await espera();
  const d = ler();
  const b = achar(d, bolaoId);
  if (b.status === "liquidado") throw new RegraError("Este bolão já foi liquidado.");
  if (b.status === "cancelado") throw new RegraError("Este bolão já está cancelado.");

  const agora = new Date().toISOString();
  // Cancelamento devolve tudo e não retém comissão: a plataforma só ganha
  // quando entrega o resultado.
  for (const p of d.participacoes.filter((x) => x.bolaoId === bolaoId)) {
    d.lancamentos.push({
      id: novoId("l"), bolaoId, tipo: "estorno", usuarioId: p.usuarioId,
      valor: -p.valorPago, descricao: "Devolução por cancelamento", criadoEm: agora,
    });
  }
  b.status = "cancelado";
  gravar(d);
  return d;
}

function achar(d: Dados, bolaoId: string): Bolao {
  const b = d.boloes.find((x) => x.id === bolaoId);
  if (!b) throw new RegraError("Bolão não encontrado.");
  return b;
}

export const lancamentosDe = (d: Dados, bolaoId: string): Lancamento[] =>
  d.lancamentos.filter((l) => l.bolaoId === bolaoId).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));

export const participantesDe = (d: Dados, bolaoId: string): Participacao[] =>
  d.participacoes.filter((p) => p.bolaoId === bolaoId).sort((a, b) => a.pagoEm.localeCompare(b.pagoEm));

export const partidasDe = (d: Dados, bolaoId: string): Partida[] =>
  d.partidas.filter((p) => p.bolaoId === bolaoId).sort((a, b) => a.inicioEm.localeCompare(b.inicioEm));

export async function restaurar(): Promise<Dados> {
  const novo = semear();
  gravar(novo);
  await espera(250, 450);
  return novo;
}
