import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Botao, Campo, Erro, Rotulo, Selecao } from "@/components/base";
import { useApp, recarregar } from "@/estado";
import * as api from "@/lib/api";
import { RegraError } from "@/lib/api";
import { brl, type Esporte } from "@/lib/tipos";

interface LinhaJogo { mandante: string; visitante: string; inicioEm: string }

const daquiADias = (n: number) => {
  const d = new Date(Date.now() + n * 86400000);
  d.setHours(16, 0, 0, 0);
  return d.toISOString().slice(0, 16);
};

/** Reais digitados viram centavos aqui, uma vez só, na borda. */
function emCentavos(texto: string): number {
  const limpo = texto.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export default function NovoBolao() {
  const { usuario } = useApp();
  const navegar = useNavigate();
  const u = usuario();

  const [nome, setNome] = useState("");
  const [esporte, setEsporte] = useState<Esporte>("futebol");
  const [cota, setCota] = useState("25,00");
  const [comissao, setComissao] = useState("10");
  const [jogos, setJogos] = useState<LinhaJogo[]>([
    { mandante: "", visitante: "", inicioEm: daquiADias(3) },
  ]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const mudarJogo = (i: number, campo: keyof LinhaJogo, valor: string) =>
    setJogos((js) => js.map((j, k) => (k === i ? { ...j, [campo]: valor } : j)));

  const centavos = emCentavos(cota);
  const pct = Number(comissao);
  const maisCedo = jogos.map((j) => j.inicioEm).filter(Boolean).sort()[0];

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!u) return;
    const novos: Record<string, string> = {};
    if (nome.trim().length < 3) novos.nome = "Dê um nome ao bolão.";
    if (!Number.isFinite(centavos) || centavos < 100) novos.cota = "A cota mínima é R$ 1,00.";
    if (!Number.isInteger(pct) || pct < 0 || pct > 30) novos.comissao = "A comissão vai de 0% a 30%.";
    jogos.forEach((j, i) => {
      if (!j.mandante.trim() || !j.visitante.trim()) novos[`jogo-${i}`] = "Preencha os dois times.";
      else if (j.mandante.trim().toLowerCase() === j.visitante.trim().toLowerCase())
        novos[`jogo-${i}`] = "Um time não joga contra ele mesmo.";
      else if (!j.inicioEm) novos[`jogo-${i}`] = "Informe quando começa.";
      else if (new Date(j.inicioEm).getTime() <= Date.now())
        novos[`jogo-${i}`] = "A partida precisa começar no futuro.";
    });
    setErros(novos);
    if (Object.keys(novos).length) return;

    setEnviando(true);
    try {
      const b = await api.criarBolao(u.id, {
        nome, esporte, valorCota: centavos, comissaoPct: pct,
        partidas: jogos.map((j) => ({
          mandante: j.mandante, visitante: j.visitante, inicioEm: new Date(j.inicioEm).toISOString(),
        })),
      });
      await recarregar();
      toast.success("Bolão criado como rascunho.");
      navegar(`/bolao/${b.id}`);
    } catch (e) {
      setErros({ nome: e instanceof RegraError ? e.message : "Não foi possível criar." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Criar bolão</h1>
      <p className="mt-1 text-sm text-tinta-media">
        Ele nasce como rascunho. Só depois de aberto o convite começa a funcionar.
      </p>

      <form onSubmit={submeter} className="mt-6 space-y-5" noValidate>
        <div>
          <Rotulo htmlFor="nome">Nome do bolão</Rotulo>
          <Campo id="nome" value={nome} erro={!!erros.nome} onChange={(e) => setNome(e.target.value)}
            placeholder="Rodada de domingo" data-testid="nome" />
          {erros.nome && <Erro>{erros.nome}</Erro>}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Rotulo htmlFor="esporte">Esporte</Rotulo>
            <Selecao id="esporte" value={esporte} onChange={(e) => setEsporte(e.target.value as Esporte)} data-testid="esporte">
              <option value="futebol">Futebol</option>
              <option value="volei">Vôlei</option>
            </Selecao>
          </div>
          <div>
            <Rotulo htmlFor="cota">Valor da cota</Rotulo>
            <Campo id="cota" value={cota} erro={!!erros.cota} onChange={(e) => setCota(e.target.value)}
              inputMode="decimal" data-testid="cota" />
            {erros.cota && <Erro>{erros.cota}</Erro>}
          </div>
          <div>
            <Rotulo htmlFor="comissao" dica="o que a plataforma retém">Comissão (%)</Rotulo>
            <Campo id="comissao" value={comissao} erro={!!erros.comissao}
              onChange={(e) => setComissao(e.target.value.replace(/\D/g, ""))} inputMode="numeric" data-testid="comissao" />
            {erros.comissao && <Erro>{erros.comissao}</Erro>}
          </div>
        </div>

        {Number.isFinite(centavos) && centavos >= 100 && Number.isInteger(pct) && pct >= 0 && pct <= 30 && (
          <p className="rounded-sm border border-linha bg-cartao px-3 py-2 text-sm text-tinta-media" data-testid="simulacao">
            Com 10 participantes entram {brl(centavos * 10)}; a plataforma retém{" "}
            <span className="mono font-semibold text-dinheiro">{brl(Math.floor((centavos * 10 * pct) / 100))}</span>{" "}
            e sobram {brl(centavos * 10 - Math.floor((centavos * 10 * pct) / 100))} para dividir.
          </p>
        )}

        <fieldset>
          <legend className="mb-1 text-sm font-medium">Partidas</legend>
          <p className="mb-3 text-xs text-tinta-media">
            As apostas fecham automaticamente no apito da partida mais cedo
            {maisCedo && <>, que neste bolão é {new Date(maisCedo).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</>}.
          </p>
          <ul className="space-y-3" data-testid="jogos">
            {jogos.map((j, i) => (
              <li key={i} className="rounded-md border border-linha bg-cartao p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Campo aria-label={`Mandante da partida ${i + 1}`} value={j.mandante} placeholder="Mandante"
                    onChange={(e) => mudarJogo(i, "mandante", e.target.value)} data-testid={`mandante-${i}`} />
                  <Campo aria-label={`Visitante da partida ${i + 1}`} value={j.visitante} placeholder="Visitante"
                    onChange={(e) => mudarJogo(i, "visitante", e.target.value)} data-testid={`visitante-${i}`} />
                  <Botao type="button" variante="fantasma" className="px-3" aria-label={`Remover partida ${i + 1}`}
                    disabled={jogos.length === 1} data-testid={`remover-${i}`}
                    onClick={() => setJogos((js) => js.filter((_, k) => k !== i))}>
                    <Trash2 className="size-4" aria-hidden />
                  </Botao>
                </div>
                <Campo type="datetime-local" className="mt-2" aria-label={`Início da partida ${i + 1}`}
                  value={j.inicioEm} onChange={(e) => mudarJogo(i, "inicioEm", e.target.value)} data-testid={`inicio-${i}`} />
                {erros[`jogo-${i}`] && <Erro>{erros[`jogo-${i}`]}</Erro>}
              </li>
            ))}
          </ul>
          <Botao type="button" variante="contorno" className="mt-3" data-testid="adicionar-jogo"
            onClick={() => setJogos((js) => [...js, { mandante: "", visitante: "", inicioEm: daquiADias(3 + js.length) }])}>
            <Plus className="size-4" aria-hidden /> Adicionar partida
          </Botao>
        </fieldset>

        <div className="flex gap-2">
          <Botao type="submit" disabled={enviando} data-testid="criar-bolao">
            {enviando ? "Criando…" : "Criar como rascunho"}
          </Botao>
          <Botao type="button" variante="fantasma" onClick={() => navegar("/")}>Cancelar</Botao>
        </div>
      </form>
    </div>
  );
}
