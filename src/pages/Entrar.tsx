import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { Botao, Campo, Erro, Rotulo } from "@/components/base";
import { useApp } from "@/estado";
import { RegraError } from "@/lib/api";

const CONTAS = [
  { rotulo: "Apostador", email: "thiago.camargo@exemplo.com.br", senha: "aposta123", nota: "aposta e também criou um bolão" },
  { rotulo: "Dono de bolão", email: "rafaela.nogueira@exemplo.com.br", senha: "dono123", nota: "configura, lança placar e liquida" },
  { rotulo: "Administrador", email: "marcelo.dantas@exemplo.com.br", senha: "admin123", nota: "vê todos os usuários e todo o caixa" },
];

export default function Entrar() {
  const { entrar } = useApp();
  const navegar = useNavigate();
  const local = useLocation() as { state?: { de?: string } };
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (!email.trim() || !senha) return setErro("Preencha e-mail e senha.");
    setEnviando(true);
    try {
      const u = await entrar(email, senha);
      toast.success(`Bem-vindo, ${u.nome.split(" ")[0]}.`);
      navegar(local.state?.de ?? "/", { replace: true });
    } catch (e) {
      setErro(e instanceof RegraError ? e.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mt-1 text-sm text-tinta-media">
        O acesso é restrito a cadastros ativos: sem conta ativa não se vê bolão nenhum.
      </p>

      <form onSubmit={submeter} className="mt-6 space-y-4" noValidate>
        <div>
          <Rotulo htmlFor="email">E-mail</Rotulo>
          <Campo id="email" type="email" value={email} erro={!!erro}
            onChange={(e) => setEmail(e.target.value)} autoComplete="username" data-testid="email" />
        </div>
        <div>
          <Rotulo htmlFor="senha">Senha</Rotulo>
          <Campo id="senha" type="password" value={senha} erro={!!erro}
            onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" data-testid="senha" />
        </div>
        {erro && <Erro>{erro}</Erro>}
        <Botao type="submit" className="w-full" disabled={enviando} data-testid="entrar">
          <LogIn className="size-4" aria-hidden /> {enviando ? "Entrando…" : "Entrar"}
        </Botao>
      </form>

      <p className="mt-4 text-center text-sm text-tinta-media">
        Não tem conta? <Link to="/criar-conta" className="font-semibold text-campo hover:underline">Criar agora</Link>
      </p>

      <section className="mt-8 rounded-md border border-linha bg-cartao p-4">
        <h2 className="text-sm font-bold">Contas para testar</h2>
        <p className="mt-0.5 text-xs text-tinta-media">Toque em uma para preencher o formulário.</p>
        <ul className="mt-3 space-y-2">
          {CONTAS.map((c) => (
            <li key={c.email}>
              <button
                type="button"
                onClick={() => { setEmail(c.email); setSenha(c.senha); setErro(""); }}
                data-testid={`conta-${c.rotulo.toLowerCase().split(" ")[0]}`}
                className="w-full rounded-sm border border-linha px-3 py-2.5 text-left hover:border-campo"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{c.rotulo}</span>
                  <span className="mono text-xs text-tinta-fraca">{c.senha}</span>
                </span>
                <span className="mono block text-xs text-tinta-media">{c.email}</span>
                <span className="block text-xs text-tinta-fraca">{c.nota}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
