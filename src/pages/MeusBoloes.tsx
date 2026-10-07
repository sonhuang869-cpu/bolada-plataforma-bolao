import { Link } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import { Esqueleto, Selo, Valor, Vazio } from "@/components/base";
import { useApp } from "@/estado";
import { caixa } from "@/lib/dinheiro";
import {
  apostasAbertas, brl, faltam, rotuloSituacao, ROTULO_ESPORTE,
  type Bolao, type Dados,
} from "@/lib/tipos";
import { useRelogio } from "@/lib/relogio";

function Cartao({ bolao, d, papel, agora }: { bolao: Bolao; d: Dados; papel: "participo" | "meu"; agora: number }) {
  const participantes = d.participacoes.filter((p) => p.bolaoId === bolao.id);
  const retido = caixa(d.lancamentos.filter((l) => l.bolaoId === bolao.id));
  const aberto = apostasAbertas(bolao, agora);
  const situacao = rotuloSituacao(bolao, agora);

  return (
    <li>
      <Link
        to={`/bolao/${bolao.id}`}
        data-testid={`bolao-${bolao.id}`}
        data-situacao={situacao}
        className="block rounded-md border border-linha bg-cartao p-4 transition-colors hover:border-campo"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold">{bolao.nome}</h3>
            <p className="text-xs text-tinta-media">
              {ROTULO_ESPORTE[bolao.esporte]} · cota de {brl(bolao.valorCota)} · comissão {bolao.comissaoPct}%
            </p>
          </div>
          <Selo tom={aberto ? "campo" : situacao === "liquidado" ? "dinheiro" : situacao === "cancelado" ? "perigo" : "neutro"}>
            {situacao}
          </Selo>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5 text-tinta-media">
            <Users className="size-4" aria-hidden /> {participantes.length}
          </span>
          <span className="text-tinta-media">
            {bolao.status === "rascunho"
              ? "ainda não publicado"
              : aberto
                ? <>fecha {faltam(bolao.fechaEm, agora)}</>
                : situacao === "liquidado" ? "encerrado" : "apostas fechadas"}
          </span>
          <span className="ml-auto flex items-baseline gap-1.5">
            <span className="text-xs text-tinta-fraca">{bolao.status === "liquidado" ? "distribuído" : "em custódia"}</span>
            <Valor>{brl(bolao.status === "liquidado"
              ? -d.lancamentos.filter((l) => l.bolaoId === bolao.id && l.tipo === "premio").reduce((s, l) => s + l.valor, 0)
              : retido)}</Valor>
          </span>
        </div>
        {papel === "meu" && <p className="mt-2 text-xs font-semibold text-campo">você é o dono</p>}
      </Link>
    </li>
  );
}

export default function MeusBoloes() {
  const { dados, carregando, usuario } = useApp();
  const u = usuario();
  const agora = useRelogio();

  if (carregando || !dados || !u) {
    return <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Esqueleto key={i} className="h-28" />)}</div>;
  }

  const meus = dados.boloes.filter((b) => b.donoId === u.id);
  const participo = dados.boloes.filter(
    (b) => b.donoId !== u.id && dados.participacoes.some((p) => p.bolaoId === b.id && p.usuarioId === u.id),
  );

  const ordenar = (lista: Bolao[]) =>
    [...lista].sort((a, b) => {
      // O que ainda dá para apostar vem primeiro: é o único que tem prazo.
      const peso = (x: Bolao) => (apostasAbertas(x, agora) ? 0 : x.status === "rascunho" ? 1 : x.status === "aberto" ? 2 : 3);
      return peso(a) - peso(b) || b.criadoEm.localeCompare(a.criadoEm);
    });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Meus bolões</h1>
          <p className="text-sm text-tinta-media">Os que você criou e os que você entrou.</p>
        </div>
        {/* Qualquer pessoa com conta pode abrir um bolão: o papel de dono nasce
            do primeiro bolão criado, não de uma permissão dada antes. */}
        <Link to="/novo-bolao" data-testid="novo-bolao"
          className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-campo px-4 text-sm font-semibold text-white hover:bg-campo/90">
          <Plus className="size-4" aria-hidden /> Criar bolão
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold tracking-wide text-tinta-media uppercase">
          Bolões que eu criei
        </h2>
        {meus.length === 0 ? (
          <Vazio titulo="Você ainda não criou nenhum bolão">
            Criar um leva menos de um minuto: nome, valor da cota, comissão e os jogos.
          </Vazio>
        ) : (
          <ul className="space-y-3" data-testid="lista-meus">
            {ordenar(meus).map((b) => <Cartao key={b.id} bolao={b} d={dados} papel="meu" agora={agora} />)}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold tracking-wide text-tinta-media uppercase">
          Bolões em que eu aposto
        </h2>
        {participo.length === 0 ? (
          <Vazio titulo="Você ainda não entrou em nenhum bolão">
            Peça o link de convite para quem criou, ou use o código em “Entrar com convite”.
          </Vazio>
        ) : (
          <ul className="space-y-3" data-testid="lista-participo">
            {ordenar(participo).map((b) => <Cartao key={b.id} bolao={b} d={dados} papel="participo" agora={agora} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
