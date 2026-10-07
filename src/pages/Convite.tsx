import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Ticket } from "lucide-react";
import { Botao, Campo, Erro, Esqueleto, Rotulo, Valor } from "@/components/base";
import { useApp, recarregar } from "@/estado";
import * as api from "@/lib/api";
import { RegraError } from "@/lib/api";
import { apostasAbertas, brl, dataHora, ROTULO_ESPORTE } from "@/lib/tipos";

/** Entrar com o código digitado, para quem recebeu o convite por fora do link. */
export function EntrarEmBolao() {
  const [codigo, setCodigo] = useState("");
  const navegar = useNavigate();
  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="text-2xl font-bold">Entrar com convite</h1>
      <p className="mt-1 text-sm text-tinta-media">Digite o código que o organizador passou.</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) navegar(`/convite/${codigo.trim().toUpperCase()}`); }}
      >
        <div>
          <Rotulo htmlFor="codigo">Código do bolão</Rotulo>
          <Campo id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="DOMINGO26" className="mono" data-testid="codigo" />
        </div>
        <Botao type="submit" className="w-full" disabled={!codigo.trim()} data-testid="ir-convite">
          <Ticket className="size-4" aria-hidden /> Ver o bolão
        </Botao>
      </form>
    </div>
  );
}

export default function Convite() {
  const { codigo = "" } = useParams();
  const { dados, carregando, usuario } = useApp();
  const navegar = useNavigate();
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState("");
  const u = usuario();

  const bolao = dados?.boloes.find((b) => b.codigoConvite.toLowerCase() === codigo.toLowerCase());

  useEffect(() => {
    if (!carregando && dados && !u) navegar(`/criar-conta?convite=${codigo}`, { replace: true });
  }, [carregando, dados, u, codigo, navegar]);

  if (carregando || !dados) return <Esqueleto className="mx-auto h-64 max-w-md" />;

  if (!bolao) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <h1 className="text-xl font-bold">Convite inválido</h1>
        <p className="mt-1 text-sm text-tinta-media">Não existe bolão com o código {codigo}.</p>
        <Link to="/" className="mt-4 inline-flex min-h-11 items-center rounded-sm border border-linha px-4 text-sm font-semibold">
          Voltar
        </Link>
      </div>
    );
  }

  const jaEstou = !!u && dados.participacoes.some((p) => p.bolaoId === bolao.id && p.usuarioId === u.id);
  const participantes = dados.participacoes.filter((p) => p.bolaoId === bolao.id).length;

  const confirmar = async () => {
    if (!u) return;
    setErro("");
    setEntrando(true);
    try {
      await api.entrarNoBolao(bolao.codigoConvite, u.id);
      await recarregar();
      toast.success("Você está no bolão.");
      navegar(`/bolao/${bolao.id}`);
    } catch (e) {
      setErro(e instanceof RegraError ? e.message : "Não foi possível entrar.");
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <p className="text-sm text-tinta-media">Você foi convidado para</p>
      <h1 className="text-2xl font-bold">{bolao.nome}</h1>

      <dl className="mt-5 space-y-2 rounded-md border border-linha bg-cartao p-4 text-sm">
        <div className="flex justify-between"><dt className="text-tinta-media">Esporte</dt><dd>{ROTULO_ESPORTE[bolao.esporte]}</dd></div>
        <div className="flex justify-between"><dt className="text-tinta-media">Valor da cota</dt><dd><Valor>{brl(bolao.valorCota)}</Valor></dd></div>
        <div className="flex justify-between"><dt className="text-tinta-media">Comissão da plataforma</dt><dd className="mono">{bolao.comissaoPct}%</dd></div>
        <div className="flex justify-between"><dt className="text-tinta-media">Já entraram</dt><dd className="mono">{participantes}</dd></div>
        <div className="flex justify-between"><dt className="text-tinta-media">Apostas até</dt><dd className="mono">{dataHora(bolao.fechaEm)}</dd></div>
      </dl>

      <p className="mt-3 text-xs text-tinta-media">
        A cota fica retida pela plataforma até o fim das partidas. Se o bolão for cancelado, ela
        volta inteira, sem desconto de comissão.
      </p>

      {erro && <Erro>{erro}</Erro>}

      {jaEstou ? (
        <Botao className="mt-4 w-full" onClick={() => navegar(`/bolao/${bolao.id}`)} data-testid="ja-estou">
          Você já está neste bolão — abrir
        </Botao>
      ) : !apostasAbertas(bolao) ? (
        <p className="mt-4 rounded-sm border border-perigo/20 bg-perigo-claro px-4 py-3 text-sm text-perigo" data-testid="convite-fechado">
          {bolao.status === "rascunho"
            ? "Este bolão ainda não foi aberto pelo organizador."
            : "As apostas deste bolão já estão fechadas."}
        </p>
      ) : (
        <Botao className="mt-4 w-full" onClick={confirmar} disabled={entrando} data-testid="entrar-bolao">
          {entrando ? "Entrando…" : `Pagar ${brl(bolao.valorCota)} e entrar`}
        </Botao>
      )}
    </div>
  );
}
