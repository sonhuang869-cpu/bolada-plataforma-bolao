import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Abas, Botao, Campo, Esqueleto, Selo, Valor, Vazio } from "@/components/base";
import { useApp, recarregar } from "@/estado";
import * as api from "@/lib/api";
import { RegraError } from "@/lib/api";
import { caixa, comissaoDe } from "@/lib/dinheiro";
import { brl, data, rotuloSituacao, ROTULO_PAPEL } from "@/lib/tipos";
import { cx } from "@/lib/cx";
import NaoEncontrado from "./NaoEncontrado";

type Aba = "financeiro" | "boloes" | "usuarios";

export default function Admin() {
  const { dados, carregando, usuario } = useApp();
  const [aba, setAba] = useState<Aba>("financeiro");
  const [q, setQ] = useState("");
  const u = usuario();

  if (carregando || !dados) return <div className="space-y-3"><Esqueleto className="h-24" /><Esqueleto className="h-64" /></div>;
  if (u?.papel !== "admin") return <NaoEncontrado />;

  // A comissão só é receita depois de liquidada: antes disso é dinheiro de
  // terceiro parado em custódia, e misturar os dois é como quebra uma plataforma.
  const comissaoRealizada = -dados.lancamentos
    .filter((l) => l.tipo === "comissao").reduce((s, l) => s + l.valor, 0);
  const emCustodia = dados.boloes
    .filter((b) => b.status === "aberto" || b.status === "rascunho")
    .reduce((s, b) => s + caixa(dados.lancamentos.filter((l) => l.bolaoId === b.id)), 0);
  // O que a plataforma reteria sobre o que já está em caixa. Usar a prévia de
  // liquidação aqui devolvia zero enquanto nenhuma partida tivesse terminado,
  // o que faz um bolão cheio de dinheiro parecer que não rende nada.
  const comissaoPrevista = dados.boloes
    .filter((b) => b.status === "aberto")
    .reduce((s, b) => s + comissaoDe(
      dados.lancamentos.filter((l) => l.bolaoId === b.id && l.tipo === "entrada").reduce((x, l) => x + l.valor, 0),
      b.comissaoPct,
    ), 0);
  const desbalanceados = dados.boloes.filter(
    (b) => (b.status === "liquidado" || b.status === "cancelado") &&
      caixa(dados.lancamentos.filter((l) => l.bolaoId === b.id)) !== 0,
  );

  const alternar = async (id: string, ativo: boolean) => {
    try {
      await api.definirAtivo(id, ativo);
      await recarregar();
      toast.success(ativo ? "Conta reativada." : "Conta desativada: essa pessoa não entra mais.");
    } catch (e) {
      toast.error(e instanceof RegraError ? e.message : "Não foi possível alterar.");
    }
  };

  const usuarios = dados.usuarios.filter(
    (x) => !q.trim() || `${x.nome} ${x.email}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Administração</h1>
        <p className="text-sm text-tinta-media">Todos os usuários, todos os bolões e todo o dinheiro.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-md border border-linha bg-cartao p-3">
          <p className="text-xs text-tinta-media">comissão realizada</p>
          <Valor grande>{brl(comissaoRealizada)}</Valor>
          <p className="text-xs text-tinta-fraca">de bolões já liquidados</p>
        </div>
        <div className="rounded-md border border-linha bg-cartao p-3">
          <p className="text-xs text-tinta-media">comissão prevista</p>
          <p className="mono text-2xl font-semibold">{brl(comissaoPrevista)}</p>
          <p className="text-xs text-tinta-fraca">se liquidassem hoje</p>
        </div>
        <div className="rounded-md border border-linha bg-cartao p-3">
          <p className="text-xs text-tinta-media">em custódia</p>
          <p className="mono text-2xl font-semibold">{brl(emCustodia)}</p>
          <p className="text-xs text-tinta-fraca">dinheiro de terceiros</p>
        </div>
        <div className="rounded-md border border-linha bg-cartao p-3">
          <p className="text-xs text-tinta-media">bolões fora do zero</p>
          <p className={cx("mono text-2xl font-semibold", desbalanceados.length ? "text-perigo" : "text-campo")}
            data-testid="desbalanceados">{desbalanceados.length}</p>
          <p className="text-xs text-tinta-fraca">encerrados com saldo</p>
        </div>
      </section>

      <p className={cx("rounded-md border px-4 py-2.5 text-sm",
        desbalanceados.length ? "border-perigo/20 bg-perigo-claro text-perigo" : "border-campo/25 bg-campo-claro text-campo")}
        data-testid="conferencia">
        {desbalanceados.length
          ? `${desbalanceados.length} bolão encerrado com dinheiro sobrando no caixa. Isso nunca deveria acontecer.`
          : "Todo bolão encerrado fecha em zero: cada centavo que entrou saiu como prêmio, comissão ou devolução."}
      </p>

      <Abas valor={aba} aoMudar={setAba} opcoes={[
        { valor: "financeiro", rotulo: "Financeiro" },
        { valor: "boloes", rotulo: "Bolões" },
        { valor: "usuarios", rotulo: "Usuários" },
      ]} />

      {aba === "financeiro" && (
        <div className="overflow-x-auto rounded-md border border-linha">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-papel text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Bolão</th>
                <th className="px-3 py-2 font-semibold">Situação</th>
                <th className="px-3 py-2 text-right font-semibold">Arrecadado</th>
                <th className="px-3 py-2 text-right font-semibold">Comissão</th>
                <th className="px-3 py-2 text-right font-semibold">Pago</th>
                <th className="px-3 py-2 text-right font-semibold">Em custódia</th>
              </tr>
            </thead>
            <tbody data-testid="financeiro">
              {dados.boloes.map((b) => {
                const ex = dados.lancamentos.filter((l) => l.bolaoId === b.id);
                const entrou = ex.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
                const com = -ex.filter((l) => l.tipo === "comissao").reduce((s, l) => s + l.valor, 0);
                const pago = -ex.filter((l) => l.tipo === "premio" || l.tipo === "estorno").reduce((s, l) => s + l.valor, 0);
                const saldo = caixa(ex);
                return (
                  <tr key={b.id} className="border-t border-linha" data-bolao={b.id}>
                    <td className="px-3 py-2">
                      <Link to={`/bolao/${b.id}`} className="font-medium text-campo hover:underline">{b.nome}</Link>
                    </td>
                    <td className="px-3 py-2"><Selo>{rotuloSituacao(b)}</Selo></td>
                    <td className="mono px-3 py-2 text-right">{brl(entrou)}</td>
                    <td className="mono px-3 py-2 text-right text-dinheiro">{brl(com)}</td>
                    <td className="mono px-3 py-2 text-right">{brl(pago)}</td>
                    <td className={cx("mono px-3 py-2 text-right font-semibold", saldo === 0 ? "text-campo" : "")}>{brl(saldo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {aba === "boloes" && (
        <ul className="space-y-2" data-testid="admin-boloes">
          {dados.boloes.map((b) => {
            const parts = dados.participacoes.filter((p) => p.bolaoId === b.id).length;
            return (
              <li key={b.id} className="rounded-md border border-linha bg-cartao p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/bolao/${b.id}`} className="font-semibold hover:underline">{b.nome}</Link>
                    <p className="text-xs text-tinta-media">
                      dono: {dados.usuarios.find((x) => x.id === b.donoId)?.nome} · {parts} participantes ·
                      cota {brl(b.valorCota)} · comissão {b.comissaoPct}% · criado {data(b.criadoEm)}
                    </p>
                  </div>
                  <Selo>{rotuloSituacao(b)}</Selo>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {aba === "usuarios" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tinta-fraca" aria-hidden />
            <Campo value={q} onChange={(e) => setQ(e.target.value)} className="pl-9"
              placeholder="Procurar por nome ou e-mail" aria-label="Procurar usuários" data-testid="busca-usuarios" />
          </div>
          {usuarios.length === 0 ? (
            <Vazio titulo={`Nada encontrado para "${q.trim()}"`} />
          ) : (
            <ul className="divide-y divide-linha rounded-md border border-linha bg-cartao" data-testid="admin-usuarios">
              {usuarios.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3" data-ativo={x.ativo}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{x.nome}</p>
                    <p className="mono truncate text-xs text-tinta-media">{x.email}</p>
                  </div>
                  <Selo tom={x.papel === "admin" ? "campo" : "neutro"}>{ROTULO_PAPEL[x.papel]}</Selo>
                  <Selo tom={x.ativo ? "campo" : "perigo"}>{x.ativo ? "ativo" : "inativo"}</Selo>
                  <Botao variante={x.ativo ? "contorno" : "primario"} className="px-3"
                    disabled={x.papel === "admin"} data-testid={`alternar-${x.id}`}
                    onClick={() => alternar(x.id, !x.ativo)}>
                    {x.ativo ? "Desativar" : "Reativar"}
                  </Botao>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-tinta-media">
            Desativar uma conta tira o acesso na hora: a pessoa não consegue entrar nem ver os
            bolões em que já está. As cotas que ela pagou continuam no caixa até o bolão liquidar.
          </p>
        </div>
      )}
    </div>
  );
}
