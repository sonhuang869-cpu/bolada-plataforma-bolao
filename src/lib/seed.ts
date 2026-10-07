import { comissaoDe, ratear } from "./dinheiro";
import { ranking, vencedores } from "./pontuacao";
import type {
  Bolao, Dados, Lancamento, Palpite, Participacao, Partida, Usuario,
} from "./tipos";

function prng(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d: Date) => d.toISOString();
const dias = (agora: Date, n: number, h = 16, m = 0) => {
  const d = new Date(agora.getTime() + n * 86400000);
  d.setHours(h, m, 0, 0);
  return d;
};

/**
 * Times inventados. Nome de clube real é marca de terceiro, e uma plataforma
 * que segura dinheiro não precisa de uma discussão dessas na demonstração.
 */
const CLUBES = [
  "Vila Marítima", "Operário do Vale", "Serrano FC", "Atlético Paranambi",
  "União Riograndense", "Esportivo Boa Vista", "Grêmio Lagoano", "Náutico do Sul",
];
const QUADRAS = ["Praia Grande Vôlei", "Centro Olímpico Norte", "Associação Barra", "Clube Ipiranga"];

const PESSOAS = [
  "Marcelo Dantas", "Rafaela Nogueira", "Thiago Camargo", "Juliana Prado",
  "Bruno Siqueira", "Camila Rezende", "Diego Fontes", "Letícia Arruda",
  "Fábio Marinho", "Patrícia Luz", "Henrique Sales", "Vanessa Lobo",
];

const email = (nome: string) =>
  nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(" ").join(".") + "@exemplo.com.br";

export function semear(agora = new Date()): Dados {
  const r = prng(20261007);
  let n = 0;
  const id = (p: string) => `${p}-${String(++n).padStart(4, "0")}`;

  const usuarios: Usuario[] = PESSOAS.map((nome, i) => ({
    id: `u-${String(i + 1).padStart(2, "0")}`,
    nome,
    email: email(nome),
    senha: i === 0 ? "admin123" : i === 1 ? "dono123" : "aposta123",
    papel: i === 0 ? "admin" : i === 1 ? "dono" : "apostador",
    ativo: i !== 11, // uma conta inativa, para o acesso restrito ter o que barrar
    criadoEm: iso(new Date(agora.getTime() - (90 - i * 4) * 86400000)),
  }));

  // A terceira pessoa é o apostador da demonstração e também cria bolões.
  usuarios[2].papel = "dono";

  const boloes: Bolao[] = [];
  const partidas: Partida[] = [];
  const palpites: Palpite[] = [];
  const participacoes: Participacao[] = [];
  const lancamentos: Lancamento[] = [];

  const entrar = (bolao: Bolao, usuarioId: string, quando: Date) => {
    participacoes.push({
      id: id("p"), bolaoId: bolao.id, usuarioId, valorPago: bolao.valorCota, pagoEm: iso(quando),
    });
    lancamentos.push({
      id: id("l"), bolaoId: bolao.id, tipo: "entrada", usuarioId,
      valor: bolao.valorCota, descricao: "Cota recebida", criadoEm: iso(quando),
    });
  };

  const palpitar = (bolao: Bolao, partida: Partida, usuarioId: string, quando: Date) => {
    const base = bolao.esporte === "volei" ? 3 : 2;
    palpites.push({
      id: id("g"), bolaoId: bolao.id, partidaId: partida.id, usuarioId,
      mandante: bolao.esporte === "volei" ? (r() < 0.5 ? 3 : Math.floor(r() * 3)) : Math.floor(r() * (base + 2)),
      visitante: bolao.esporte === "volei" ? (r() < 0.5 ? 3 : Math.floor(r() * 3)) : Math.floor(r() * (base + 1)),
      criadoEm: iso(quando),
    });
  };

  // ---------- 1. aberto, apostas ainda rolando ----------
  const aberto: Bolao = {
    id: "b-01",
    nome: "Rodada de domingo",
    esporte: "futebol",
    donoId: usuarios[1].id,
    valorCota: 2500,
    comissaoPct: 10,
    codigoConvite: "DOMINGO26",
    status: "aberto",
    fechaEm: iso(dias(agora, 2, 15, 30)),
    criadoEm: iso(new Date(agora.getTime() - 5 * 86400000)),
  };
  boloes.push(aberto);
  for (let i = 0; i < 4; i++) {
    partidas.push({
      id: id("m"), bolaoId: aberto.id,
      mandante: CLUBES[i * 2], visitante: CLUBES[i * 2 + 1],
      inicioEm: iso(dias(agora, 2, 16 + i, 0)),
      placarMandante: null, placarVisitante: null, status: "agendada",
    });
  }
  const noAberto = [1, 2, 3, 4, 5, 6, 7].map((i) => usuarios[i].id);
  noAberto.forEach((uid, i) => entrar(aberto, uid, new Date(agora.getTime() - (4 - i * 0.4) * 86400000)));
  // o apostador da demonstração ainda não palpitou em tudo: sobra o que fazer
  for (const uid of noAberto) {
    const minhas = partidas.filter((p) => p.bolaoId === aberto.id);
    const quantas = uid === usuarios[2].id ? 2 : 4;
    minhas.slice(0, quantas).forEach((m) => palpitar(aberto, m, uid, new Date(agora.getTime() - 2 * 86400000)));
  }

  // ---------- 2. fechado pelo relógio, com resultados saindo ----------
  const andamento: Bolao = {
    id: "b-02",
    nome: "Clássicos da semana",
    esporte: "futebol",
    donoId: usuarios[1].id,
    valorCota: 1750,
    comissaoPct: 11,
    codigoConvite: "CLASSICO26",
    status: "aberto",
    fechaEm: iso(dias(agora, -1, 16, 0)),
    criadoEm: iso(new Date(agora.getTime() - 9 * 86400000)),
  };
  boloes.push(andamento);
  const resultados: [number, number][] = [[2, 1], [0, 0], [3, 2], [1, 2]];
  for (let i = 0; i < 4; i++) {
    const encerrada = i < 2;
    partidas.push({
      id: id("m"), bolaoId: andamento.id,
      mandante: CLUBES[(i + 3) % 8], visitante: CLUBES[(i + 6) % 8],
      inicioEm: iso(dias(agora, -1, 17 + i, 0)),
      placarMandante: encerrada ? resultados[i][0] : null,
      placarVisitante: encerrada ? resultados[i][1] : null,
      status: encerrada ? "encerrada" : "agendada",
    });
  }
  const noAndamento = [1, 2, 3, 4, 5, 6, 8, 9, 10].map((i) => usuarios[i].id);
  noAndamento.forEach((uid, i) => entrar(andamento, uid, new Date(agora.getTime() - (8 - i * 0.5) * 86400000)));
  for (const uid of noAndamento)
    partidas.filter((p) => p.bolaoId === andamento.id)
      .forEach((m) => palpitar(andamento, m, uid, new Date(agora.getTime() - 2 * 86400000)));

  // ---------- 3. liquidado, com o extrato fechando em zero ----------
  const fechado: Bolao = {
    id: "b-03",
    nome: "Superliga — fase final",
    esporte: "volei",
    donoId: usuarios[2].id,
    valorCota: 2990,
    comissaoPct: 10,
    codigoConvite: "SUPER26",
    status: "liquidado",
    fechaEm: iso(dias(agora, -12, 18, 0)),
    criadoEm: iso(new Date(agora.getTime() - 20 * 86400000)),
  };
  boloes.push(fechado);
  const placaresVolei: [number, number][] = [[3, 1], [3, 2], [2, 3]];
  for (let i = 0; i < 3; i++) {
    partidas.push({
      id: id("m"), bolaoId: fechado.id,
      mandante: QUADRAS[i], visitante: QUADRAS[(i + 1) % 4],
      inicioEm: iso(dias(agora, -12, 19 + i, 0)),
      placarMandante: placaresVolei[i][0], placarVisitante: placaresVolei[i][1], status: "encerrada",
    });
  }
  const noFechado = [2, 3, 4, 6, 7, 9, 10].map((i) => usuarios[i].id);
  noFechado.forEach((uid, i) => entrar(fechado, uid, new Date(agora.getTime() - (19 - i * 0.6) * 86400000)));
  for (const uid of noFechado)
    partidas.filter((p) => p.bolaoId === fechado.id)
      .forEach((m) => palpitar(fechado, m, uid, new Date(agora.getTime() - 13 * 86400000)));

  // Um empate de propósito no topo. Sem ele o bolão encerrado teria um único
  // vencedor, o prêmio não precisaria ser dividido e a regra do centavo que
  // sobra — que é justamente o que pode fazer o caixa não fechar — nunca
  // apareceria na tela de ninguém.
  {
    const parcial = ranking(
      palpites.filter((p) => p.bolaoId === fechado.id),
      partidas.filter((p) => p.bolaoId === fechado.id),
      noFechado,
    );
    const lider = parcial[0].usuarioId;
    const empatado = noFechado.find((u) => u !== lider)!;
    for (const p of palpites.filter((x) => x.bolaoId === fechado.id && x.usuarioId === empatado)) {
      const doLider = palpites.find(
        (x) => x.bolaoId === fechado.id && x.usuarioId === lider && x.partidaId === p.partidaId,
      );
      if (doLider) {
        p.mandante = doLider.mandante;
        p.visitante = doLider.visitante;
      }
    }
  }

  // liquidação com as mesmas funções que a interface usa
  const liquidadoEm = new Date(agora.getTime() - 11 * 86400000);
  const totalFechado = noFechado.length * fechado.valorCota;
  const comissao = comissaoDe(totalFechado, fechado.comissaoPct);
  lancamentos.push({
    id: id("l"), bolaoId: fechado.id, tipo: "comissao", usuarioId: null,
    valor: -comissao, descricao: `Comissão da plataforma (${fechado.comissaoPct}%)`, criadoEm: iso(liquidadoEm),
  });
  const classificacao = ranking(
    palpites.filter((p) => p.bolaoId === fechado.id),
    partidas.filter((p) => p.bolaoId === fechado.id),
    noFechado,
  );
  const ganhadores = vencedores(classificacao);
  const ordemEntrada = participacoes
    .filter((p) => p.bolaoId === fechado.id && ganhadores.includes(p.usuarioId))
    .sort((a, b) => a.pagoEm.localeCompare(b.pagoEm))
    .map((p) => p.usuarioId);
  for (const parte of ratear(totalFechado - comissao, ordemEntrada)) {
    lancamentos.push({
      id: id("l"), bolaoId: fechado.id, tipo: "premio", usuarioId: parte.usuarioId,
      valor: -parte.valor,
      descricao: parte.centavoExtra ? "Prêmio, com o centavo da divisão" : "Prêmio",
      criadoEm: iso(liquidadoEm),
    });
  }

  // ---------- 4. rascunho do dono, ainda sem convidar ninguém ----------
  boloes.push({
    id: "b-04",
    nome: "Quartas de final",
    esporte: "futebol",
    donoId: usuarios[1].id,
    valorCota: 2000,
    comissaoPct: 8,
    codigoConvite: "QUARTAS26",
    status: "rascunho",
    fechaEm: iso(dias(agora, 9, 15, 0)),
    criadoEm: iso(new Date(agora.getTime() - 1 * 86400000)),
  });
  for (let i = 0; i < 2; i++) {
    partidas.push({
      id: id("m"), bolaoId: "b-04",
      mandante: CLUBES[i], visitante: CLUBES[7 - i],
      inicioEm: iso(dias(agora, 9, 16 + i, 0)),
      placarMandante: null, placarVisitante: null, status: "agendada",
    });
  }

  return { usuarios, boloes, partidas, palpites, participacoes, lancamentos, sessaoId: null };
}
