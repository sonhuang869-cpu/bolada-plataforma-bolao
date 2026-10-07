import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Lock, Trophy } from "lucide-react";
import { Abas, Botao, Campo, Dialogo, Esqueleto, Selo, Valor, Vazio } from "@/components/base";
import { useApp, recarregar } from "@/estado";
import * as api from "@/lib/api";
import { RegraError } from "@/lib/api";
import { caixa, comissaoDe, resumo } from "@/lib/dinheiro";
import { PONTOS, REGRAS, pontosDoPalpite, ranking, vencedores } from "@/lib/pontuacao";
import {
  apostasAbertas, brl, dataHora, faltam, rotuloSituacao,
  ROTULO_ESPORTE, type Partida,
} from "@/lib/tipos";
import { cx } from "@/lib/cx";
import { useRelogio } from "@/lib/relogio";
import NaoEncontrado from "./NaoEncontrado";

type Aba = "palpites" | "ranking" | "caixa" | "gerir";

export default function BolaoDetalhe() {
  const { id = "" } = useParams();
  const { dados, carregando, usuario } = useApp();
  const u = usuario();
  const [aba, setAba] = useState<Aba>("palpites");
  const [copiado, setCopiado] = useState(false);
  const [liquidando, setLiquidando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const agora = useRelogio();

  if (carregando || !dados || !u) return <div className="space-y-3"><Esqueleto className="h-24" /><Esqueleto className="h-64" /></div>;

  const bolao = dados.boloes.find((b) => b.id === id);
  if (!bolao) return <NaoEncontrado />;

  const souDono = bolao.donoId === u.id;
  const participantes = api.participantesDe(dados, bolao.id);
  const souParticipante = participantes.some((p) => p.usuarioId === u.id);
  // Acesso restrito não é só login: quem não entrou no bolão não vê o bolão.
  if (!souDono && !souParticipante && u.papel !== "admin") {
    return (
      <Vazio titulo="Você não está neste bolão">
        <p>Peça o link de convite para quem organiza.</p>
        <Link to="/" className="mt-3 inline-flex min-h-11 items-center rounded-sm border border-linha px-4 font-semibold text-campo hover:border-campo">
          Voltar para meus bolões
        </Link>
      </Vazio>
    );
  }

  const partidas = api.partidasDe(dados, bolao.id);
  const meusPalpites = dados.palpites.filter((p) => p.bolaoId === bolao.id && p.usuarioId === u.id);
  const classificacao = ranking(
    dados.palpites.filter((p) => p.bolaoId === bolao.id), partidas, participantes.map((p) => p.usuarioId),
  );
  const ganhadores = vencedores(classificacao);
  const extrato = api.lancamentosDe(dados, bolao.id);
  const r = resumo(extrato);
  const aberto = apostasAbertas(bolao, agora);
  const situacao = rotuloSituacao(bolao, agora);
  const nome = (uid: string) => dados.usuarios.find((x) => x.id === uid)?.nome ?? "—";
  const linkConvite = `${window.location.origin}/convite/${bolao.codigoConvite}`;

  const abas: { valor: Aba; rotulo: string }[] = [
    { valor: "palpites", rotulo: "Palpites" },
    { valor: "ranking", rotulo: "Classificação" },
    { valor: "caixa", rotulo: "Caixa" },
    ...(souDono ? [{ valor: "gerir" as Aba, rotulo: "Gerir" }] : []),
  ];

  const liquidar = async () => {
    setLiquidando(false);
    try {
      await api.liquidar(bolao.id);
      await recarregar();
      toast.success("Bolão liquidado. O caixa fechou em zero.");
    } catch (e) {
      toast.error(e instanceof RegraError ? e.message : "Não foi possível liquidar.");
    }
  };

  const cancelar = async () => {
    setCancelando(false);
    try {
      await api.cancelar(bolao.id);
      await recarregar();
      toast.success("Bolão cancelado e todas as cotas devolvidas.");
    } catch (e) {
      toast.error(e instanceof RegraError ? e.message : "Não foi possível cancelar.");
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/" className="-ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-sm text-tinta-media hover:text-tinta">
        <ArrowLeft className="size-4" aria-hidden /> Meus bolões
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{bolao.nome}</h1>
          <p className="text-sm text-tinta-media">
            {ROTULO_ESPORTE[bolao.esporte]} · cota de {brl(bolao.valorCota)} · comissão de {bolao.comissaoPct}% ·
            organizado por {nome(bolao.donoId)}
          </p>
        </div>
        <Selo tom={aberto ? "campo" : situacao === "liquidado" ? "dinheiro" : situacao === "cancelado" ? "perigo" : "neutro"}>
          {situacao}
        </Selo>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="resumo">
        <div className="rounded-md border border-linha bg-cartao p-3">
          <p className="text-xs text-tinta-media">participantes</p>
          <p className="mono text-xl font-bold" data-testid="qtd-participantes">{participantes.length}</p>
        </div>
        <div className="rounded-md border border-linha bg-cartao p-3">
          <p className="text-xs text-tinta-media">arrecadado</p>
          <Valor grande>{brl(r.arrecadado)}</Valor>
        </div>
        <div className="rounded-md border border-linha bg-cartao p-3">
          <p className="text-xs text-tinta-media">{bolao.status === "liquidado" ? "comissão retida" : "comissão prevista"}</p>
          <p className="mono text-xl font-bold" data-testid="comissao">
            {brl(bolao.status === "liquidado" ? r.comissao : comissaoDe(r.arrecadado, bolao.comissaoPct))}
          </p>
        </div>
        <div className="rounded-md border border-linha bg-cartao p-3">
          <p className="text-xs text-tinta-media">{bolao.status === "liquidado" ? "em custódia" : "sob custódia"}</p>
          <p className={cx("mono text-xl font-bold", caixa(extrato) === 0 && "text-campo")} data-testid="custodia">
            {brl(caixa(extrato))}
          </p>
        </div>
      </section>

      {aberto && (
        <p className="rounded-md border border-campo/25 bg-campo-claro px-4 py-2.5 text-sm text-campo" data-testid="prazo">
          As apostas fecham {faltam(bolao.fechaEm, agora)}, no apito da primeira partida — {dataHora(bolao.fechaEm)}.
        </p>
      )}

      <Abas valor={aba} aoMudar={setAba} opcoes={abas} />

      {aba === "palpites" && (
        <Palpites
          partidas={partidas} bolaoId={bolao.id} usuarioId={u.id} podeApostar={aberto && souParticipante}
          palpites={meusPalpites} esporte={bolao.esporte}
        />
      )}

      {aba === "ranking" && (
        <section>
          {classificacao.length === 0 ? (
            <Vazio titulo="Ninguém entrou ainda" />
          ) : (
            <>
              <ul className="divide-y divide-linha rounded-md border border-linha bg-cartao" data-testid="ranking">
                {classificacao.map((l) => {
                  const ganhou = bolao.status === "liquidado" && ganhadores.includes(l.usuarioId);
                  const premio = extrato.find((x) => x.tipo === "premio" && x.usuarioId === l.usuarioId);
                  return (
                    <li key={l.usuarioId} className="flex items-center gap-3 px-4 py-3" data-usuario={l.usuarioId}>
                      <span className={cx("mono w-7 shrink-0 text-center text-sm font-bold",
                        l.posicao === 1 ? "text-dinheiro" : "text-tinta-fraca")}>{l.posicao}º</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {nome(l.usuarioId)}{l.usuarioId === u.id && <span className="text-tinta-fraca"> (você)</span>}
                        </span>
                        <span className="text-xs text-tinta-media">
                          {l.exatos} placar{l.exatos === 1 ? "" : "es"} exato{l.exatos === 1 ? "" : "s"}
                        </span>
                      </span>
                      {ganhou && <Trophy className="size-4 shrink-0 text-dinheiro" aria-label="venceu" />}
                      {premio && <Valor>{brl(-premio.valor)}</Valor>}
                      <span className="mono w-12 shrink-0 text-right font-bold">{l.pontos}</span>
                    </li>
                  );
                })}
              </ul>
              {/* Quem recebeu um centavo a menos que o outro vai procurar a
                  explicação aqui, e não no extrato. */}
              {bolao.status === "liquidado" && ganhadores.length > 1 && (
                <p className="mt-3 rounded-md border border-dinheiro/25 bg-dinheiro-claro px-4 py-3 text-sm" data-testid="nota-empate">
                  {ganhadores.length} pessoas empataram em primeiro e dividiram {brl(r.pago)}.
                  {extrato.some((x) => x.tipo === "premio" && /centavo/.test(x.descricao)) && (
                    <> A divisão não deu exata: o centavo que sobrou ficou com quem entrou primeiro
                      no bolão, e por isso as partes diferem em um centavo e a soma fecha certo.</>
                  )}
                </p>
              )}

              <div className="mt-3 rounded-md border border-linha bg-cartao p-4">
                <h3 className="text-sm font-bold">Como pontua</h3>
                <ul className="mt-2 space-y-1 text-sm text-tinta-media">
                  {REGRAS.map((regra) => (
                    <li key={regra.pontos} className="flex justify-between gap-3">
                      <span>{regra.texto}</span>
                      <span className="mono shrink-0 font-semibold text-tinta">{regra.pontos}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-tinta-fraca">
                  Empate em pontos e em placares exatos é empate de verdade: as duas pessoas dividem a
                  mesma posição e o prêmio é dividido entre elas.
                </p>
              </div>
            </>
          )}
        </section>
      )}

      {aba === "caixa" && <Caixa bolaoId={bolao.id} />}

      {aba === "gerir" && souDono && (
        <Gerir
          bolaoId={bolao.id} linkConvite={linkConvite} copiado={copiado} setCopiado={setCopiado}
          aoLiquidar={() => setLiquidando(true)} aoCancelar={() => setCancelando(true)}
        />
      )}

      <Dialogo aberto={liquidando} aoFechar={() => setLiquidando(false)} titulo="Liquidar o bolão"
        descricao="Depois disso o caixa é distribuído e não dá para voltar atrás." testid="dialogo-liquidar">
        <Previa bolaoId={bolao.id} />
        <div className="mt-4 flex justify-end gap-2">
          <Botao variante="fantasma" onClick={() => setLiquidando(false)}>Agora não</Botao>
          <Botao onClick={liquidar} data-testid="confirmar-liquidar">Liquidar e pagar</Botao>
        </div>
      </Dialogo>

      <Dialogo aberto={cancelando} aoFechar={() => setCancelando(false)} titulo="Cancelar o bolão"
        descricao="Todas as cotas voltam para quem pagou e a plataforma não retém comissão." testid="dialogo-cancelar">
        <p className="text-sm text-tinta-media">
          Serão devolvidas {participantes.length} cotas, somando {brl(r.arrecadado)}.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Botao variante="fantasma" onClick={() => setCancelando(false)}>Voltar</Botao>
          <Botao variante="perigo" onClick={cancelar} data-testid="confirmar-cancelar">Cancelar e devolver</Botao>
        </div>
      </Dialogo>
    </div>
  );
}

function Palpites({ partidas, bolaoId, usuarioId, podeApostar, palpites, esporte }: {
  partidas: Partida[]; bolaoId: string; usuarioId: string; podeApostar: boolean;
  palpites: { partidaId: string; mandante: number; visitante: number }[]; esporte: "futebol" | "volei";
}) {
  const [salvando, setSalvando] = useState<string | null>(null);
  const agora = useRelogio();
  const meu = (pid: string) => palpites.find((p) => p.partidaId === pid);

  const salvar = async (partidaId: string, m: string, v: string) => {
    const mandante = Number(m);
    const visitante = Number(v);
    if (!Number.isInteger(mandante) || !Number.isInteger(visitante) || mandante < 0 || visitante < 0) {
      toast.error("Use números inteiros a partir de zero.");
      return;
    }
    setSalvando(partidaId);
    try {
      await api.salvarPalpite(bolaoId, partidaId, usuarioId, mandante, visitante);
      await recarregar();
      toast.success("Palpite salvo.");
    } catch (e) {
      toast.error(e instanceof RegraError ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(null);
    }
  };

  if (!partidas.length) return <Vazio titulo="Este bolão ainda não tem partidas" />;

  return (
    <ul className="space-y-3" data-testid="partidas">
      {partidas.map((p) => {
        const palpite = meu(p.id);
        const comecou = new Date(p.inicioEm).getTime() <= agora;
        const editavel = podeApostar && !comecou;
        const pontos = palpite && p.status === "encerrada"
          ? pontosDoPalpite({ ...palpite, id: "", bolaoId, usuarioId, criadoEm: "" }, p)
          : null;

        return (
          <li key={p.id} className="rounded-md border border-linha bg-cartao p-4" data-testid={`partida-${p.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{p.mandante} <span className="text-tinta-fraca">×</span> {p.visitante}</p>
                <p className="text-xs text-tinta-media">{dataHora(p.inicioEm)}</p>
              </div>
              {p.status === "encerrada" ? (
                <span className="placar shrink-0 text-lg font-bold" data-testid={`resultado-${p.id}`}>
                  {p.placarMandante} × {p.placarVisitante}
                </span>
              ) : comecou ? (
                <Selo>em andamento</Selo>
              ) : (
                <Selo tom="campo">{faltam(p.inicioEm, agora)}</Selo>
              )}
            </div>

            <FormaPalpite
              key={`${p.id}-${palpite?.mandante ?? "x"}-${palpite?.visitante ?? "x"}`}
              partidaId={p.id} inicial={palpite} editavel={editavel} salvando={salvando === p.id}
              aoSalvar={salvar} esporte={esporte} comecou={comecou}
            />

            {pontos !== null && (
              <p className={cx("mt-2 text-sm font-semibold", pontos === PONTOS.exato ? "text-campo" : pontos > 0 ? "text-tinta" : "text-tinta-fraca")}
                data-testid={`pontos-${p.id}`}>
                {pontos === PONTOS.exato ? "Placar exato · " : ""}{pontos} ponto{pontos === 1 ? "" : "s"}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FormaPalpite({ partidaId, inicial, editavel, salvando, aoSalvar, esporte, comecou }: {
  partidaId: string;
  inicial?: { mandante: number; visitante: number };
  editavel: boolean; salvando: boolean; comecou: boolean;
  aoSalvar: (id: string, m: string, v: string) => void;
  esporte: "futebol" | "volei";
}) {
  const [m, setM] = useState(inicial ? String(inicial.mandante) : "");
  const [v, setV] = useState(inicial ? String(inicial.visitante) : "");
  const mudou = inicial ? String(inicial.mandante) !== m || String(inicial.visitante) !== v : m !== "" && v !== "";

  if (!editavel) {
    return (
      <p className="mt-3 flex items-center gap-2 text-sm text-tinta-media" data-testid={`palpite-${partidaId}`}>
        <Lock className="size-3.5" aria-hidden />
        {inicial
          ? <>Seu palpite: <span className="placar font-bold text-tinta">{inicial.mandante} × {inicial.visitante}</span></>
          : comecou ? "Você não palpitou nesta partida." : "As apostas estão fechadas."}
      </p>
    );
  }

  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2"
      onSubmit={(e) => { e.preventDefault(); aoSalvar(partidaId, m, v); }}
    >
      <label className="sr-only" htmlFor={`m-${partidaId}`}>Gols do mandante</label>
      <Campo id={`m-${partidaId}`} inputMode="numeric" value={m} onChange={(e) => setM(e.target.value.replace(/\D/g, ""))}
        className="w-16 text-center" placeholder={esporte === "volei" ? "3" : "0"} data-testid={`campo-m-${partidaId}`} />
      <span className="text-tinta-fraca">×</span>
      <label className="sr-only" htmlFor={`v-${partidaId}`}>Gols do visitante</label>
      <Campo id={`v-${partidaId}`} inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))}
        className="w-16 text-center" placeholder={esporte === "volei" ? "1" : "0"} data-testid={`campo-v-${partidaId}`} />
      <Botao type="submit" variante={mudou ? "primario" : "contorno"} disabled={!m || !v || salvando || !mudou}
        className="px-3" data-testid={`salvar-${partidaId}`}>
        {salvando ? "Salvando…" : inicial ? "Corrigir" : "Salvar"}
      </Botao>
      {inicial && !mudou && <span className="flex items-center gap-1 text-xs text-campo"><Check className="size-3.5" aria-hidden /> salvo</span>}
    </form>
  );
}

function Previa({ bolaoId }: { bolaoId: string }) {
  const dados = useApp((e) => e.dados)!;
  const conta = api.previa(dados, bolaoId);
  const nome = (uid: string) => dados.usuarios.find((x) => x.id === uid)?.nome ?? "—";

  if (conta.semVencedor) {
    return (
      <div className="rounded-sm border border-perigo/20 bg-perigo-claro p-3 text-sm" data-testid="previa">
        Ninguém pontuou neste bolão. Nesse caso as cotas voltam inteiras para quem pagou e a
        plataforma não retém comissão: serão devolvidos {brl(conta.arrecadado)}.
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm" data-testid="previa">
      <div className="flex justify-between"><span className="text-tinta-media">Arrecadado</span><span className="mono font-semibold">{brl(conta.arrecadado)}</span></div>
      <div className="flex justify-between"><span className="text-tinta-media">Comissão da plataforma</span><span className="mono font-semibold" data-testid="previa-comissao" data-centavos={conta.comissao}>− {brl(conta.comissao)}</span></div>
      <div className="flex justify-between border-t border-linha pt-2"><span className="font-semibold">A distribuir</span><Valor className="" data-testid="previa-premio">{brl(conta.premio)}</Valor></div>
      <ul className="mt-2 space-y-1 border-t border-linha pt-2">
        {conta.partes.map((parte) => (
          <li key={parte.usuarioId} className="flex justify-between gap-3" data-testid="previa-parte" data-centavos={parte.valor} data-extra={parte.centavoExtra}>
            <span className="truncate">{nome(parte.usuarioId)}</span>
            <span className="mono shrink-0">
              {brl(parte.valor)}
              {parte.centavoExtra && <span className="ml-1 text-xs text-dinheiro">+1¢</span>}
            </span>
          </li>
        ))}
      </ul>
      {conta.partes.some((p) => p.centavoExtra) && (
        <p className="text-xs text-tinta-fraca">
          A divisão não deu exata. O centavo que sobrou vai para quem entrou primeiro no bolão, e
          por isso a soma das partes fecha com o valor a distribuir, sem perder nem inventar
          dinheiro.
        </p>
      )}
    </div>
  );
}

function Caixa({ bolaoId }: { bolaoId: string }) {
  const dados = useApp((e) => e.dados)!;
  const extrato = api.lancamentosDe(dados, bolaoId);
  const r = resumo(extrato);
  const retido = caixa(extrato);
  const nome = (uid: string | null) => (uid ? dados.usuarios.find((x) => x.id === uid)?.nome ?? "—" : "plataforma");

  if (!extrato.length) return <Vazio titulo="Nenhum lançamento ainda">O caixa começa quando a primeira pessoa entra.</Vazio>;

  return (
    <section className="space-y-3">
      <div className="rounded-md border border-linha bg-cartao p-4">
        <h2 className="text-sm font-bold">Conferência</h2>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-tinta-media">Entradas</dt><dd className="mono">{brl(r.arrecadado)}</dd></div>
          <div className="flex justify-between"><dt className="text-tinta-media">Comissão</dt><dd className="mono">− {brl(r.comissao)}</dd></div>
          <div className="flex justify-between"><dt className="text-tinta-media">Prêmios pagos</dt><dd className="mono">− {brl(r.pago)}</dd></div>
          <div className="flex justify-between"><dt className="text-tinta-media">Devoluções</dt><dd className="mono">− {brl(r.estornado)}</dd></div>
          <div className="flex justify-between border-t border-linha pt-1.5">
            <dt className="font-bold">Em custódia</dt>
            <dd className={cx("mono font-bold", retido === 0 ? "text-campo" : "text-dinheiro")} data-testid="caixa-saldo">{brl(retido)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-tinta-fraca">
          {retido === 0
            ? "Fechou em zero: tudo o que entrou saiu, até o último centavo."
            : "Este é o valor que a plataforma está segurando até o fim das partidas."}
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-linha">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">Extrato do bolão</caption>
          <thead className="bg-papel text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Quando</th>
              <th className="px-3 py-2 font-semibold">Lançamento</th>
              <th className="px-3 py-2 font-semibold">Pessoa</th>
              <th className="px-3 py-2 text-right font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody data-testid="extrato">
            {extrato.map((l) => (
              <tr key={l.id} className="border-t border-linha" data-tipo={l.tipo}>
                <td className="mono px-3 py-2 whitespace-nowrap text-tinta-media">{dataHora(l.criadoEm)}</td>
                <td className="px-3 py-2">{l.descricao}</td>
                <td className="px-3 py-2 text-tinta-media">{nome(l.usuarioId)}</td>
                <td className={cx("mono px-3 py-2 text-right font-semibold", l.valor < 0 ? "text-tinta-media" : "text-dinheiro")}>
                  {l.valor < 0 ? "− " : "+ "}{brl(Math.abs(l.valor))}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-tinta bg-papel">
              <td className="px-3 py-2 font-bold" colSpan={3}>Soma</td>
              <td className={cx("mono px-3 py-2 text-right font-bold", retido === 0 ? "text-campo" : "text-dinheiro")}>{brl(retido)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Gerir({ bolaoId, linkConvite, copiado, setCopiado, aoLiquidar, aoCancelar }: {
  bolaoId: string; linkConvite: string; copiado: boolean; setCopiado: (v: boolean) => void;
  aoLiquidar: () => void; aoCancelar: () => void;
}) {
  const dados = useApp((e) => e.dados)!;
  const bolao = dados.boloes.find((b) => b.id === bolaoId)!;
  const partidas = api.partidasDe(dados, bolaoId);
  const participantes = api.participantesDe(dados, bolaoId);
  const encerrado = bolao.status === "liquidado" || bolao.status === "cancelado";
  const nome = (uid: string) => dados.usuarios.find((x) => x.id === uid)?.nome ?? "—";

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(linkConvite);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie à mão.");
    }
  };

  const publicar = async () => {
    try {
      await api.publicar(bolaoId);
      await recarregar();
      toast.success("Bolão aberto. Agora o convite funciona.");
    } catch (e) {
      toast.error(e instanceof RegraError ? e.message : "Não foi possível publicar.");
    }
  };

  return (
    <section className="space-y-4">
      {bolao.status === "rascunho" && (
        <div className="rounded-md border border-dinheiro/25 bg-dinheiro-claro p-4">
          <h2 className="text-sm font-bold">Ainda é um rascunho</h2>
          <p className="mt-1 text-sm text-tinta-media">
            Enquanto estiver em rascunho o convite não funciona e ninguém consegue entrar. Confira as
            partidas e a cota antes de abrir, porque depois já vai ter gente com dinheiro dentro.
          </p>
          <Botao className="mt-3" onClick={publicar} data-testid="publicar">Abrir o bolão</Botao>
        </div>
      )}

      <div className="rounded-md border border-linha bg-cartao p-4">
        <h2 className="text-sm font-bold">Link de convite</h2>
        <p className="mt-0.5 text-xs text-tinta-media">Quem abrir o link cria a conta e entra direto neste bolão.</p>
        <div className="mt-2 flex gap-2">
          <Campo readOnly value={linkConvite} aria-label="Link de convite" data-testid="link-convite" className="mono text-xs" />
          <Botao variante="contorno" onClick={copiar} className="shrink-0 px-3" data-testid="copiar-convite">
            {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copiado ? "Copiado" : "Copiar"}
          </Botao>
        </div>
        <p className="mono mt-2 text-xs text-tinta-fraca">código: {bolao.codigoConvite}</p>
      </div>

      <div className="rounded-md border border-linha bg-cartao p-4">
        <h2 className="text-sm font-bold">Lançar resultados</h2>
        <p className="mt-0.5 text-xs text-tinta-media">
          Só depois do apito inicial. Antes disso o sistema recusa, porque placar lançado cedo mexe na
          classificação de quem ainda podia apostar.
        </p>
        <ul className="mt-3 space-y-2" data-testid="lancar-placar">
          {partidas.map((p) => <LinhaPlacar key={p.id} partida={p} bloqueado={encerrado} />)}
        </ul>
      </div>

      <div className="rounded-md border border-linha bg-cartao p-4">
        <h2 className="text-sm font-bold">Participantes ({participantes.length})</h2>
        <ul className="mt-2 divide-y divide-linha" data-testid="participantes">
          {participantes.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate">{nome(p.usuarioId)}</span>
                <span className="text-xs text-tinta-fraca">{i + 1}º a entrar · {dataHora(p.pagoEm)}</span>
              </span>
              <span className="mono shrink-0">{brl(p.valorPago)}</span>
            </li>
          ))}
          {!participantes.length && <li className="py-3 text-sm text-tinta-media">Ninguém entrou ainda.</li>}
        </ul>
      </div>

      {!encerrado && (
        <div className="flex flex-wrap gap-2">
          <Botao onClick={aoLiquidar} data-testid="liquidar" disabled={bolao.status !== "aberto"}>
            Liquidar e pagar
          </Botao>
          <Botao variante="contorno" onClick={aoCancelar} data-testid="cancelar">
            Cancelar e devolver
          </Botao>
        </div>
      )}
    </section>
  );
}

function LinhaPlacar({ partida, bloqueado }: { partida: Partida; bloqueado: boolean }) {
  const [m, setM] = useState(partida.placarMandante === null ? "" : String(partida.placarMandante));
  const [v, setV] = useState(partida.placarVisitante === null ? "" : String(partida.placarVisitante));
  const [salvando, setSalvando] = useState(false);
  const agora = useRelogio();
  const comecou = new Date(partida.inicioEm).getTime() <= agora;

  const salvar = async () => {
    setSalvando(true);
    try {
      await api.lancarPlacar(partida.id, Number(m), Number(v));
      await recarregar();
      toast.success("Placar lançado.");
    } catch (e) {
      toast.error(e instanceof RegraError ? e.message : "Não foi possível lançar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-linha pb-2 last:border-0">
      <span className="min-w-0 flex-1 text-sm">
        {partida.mandante} <span className="text-tinta-fraca">×</span> {partida.visitante}
        {!comecou && <span className="block text-xs text-tinta-fraca">começa {faltam(partida.inicioEm, agora)}</span>}
      </span>
      <Campo aria-label={`Gols de ${partida.mandante}`} inputMode="numeric" value={m} disabled={!comecou || bloqueado}
        onChange={(e) => setM(e.target.value.replace(/\D/g, ""))} className="w-14 text-center" data-testid={`placar-m-${partida.id}`} />
      <Campo aria-label={`Gols de ${partida.visitante}`} inputMode="numeric" value={v} disabled={!comecou || bloqueado}
        onChange={(e) => setV(e.target.value.replace(/\D/g, ""))} className="w-14 text-center" data-testid={`placar-v-${partida.id}`} />
      <Botao variante="contorno" className="px-3" disabled={!comecou || bloqueado || !m || !v || salvando}
        onClick={salvar} data-testid={`lancar-${partida.id}`}>
        {salvando ? "…" : partida.status === "encerrada" ? "Corrigir" : "Lançar"}
      </Botao>
    </li>
  );
}
