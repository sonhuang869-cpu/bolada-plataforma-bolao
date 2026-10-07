import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Botao, Campo, Erro, Rotulo } from "@/components/base";
import { useApp } from "@/estado";
import { RegraError } from "@/lib/api";

export default function CriarConta() {
  const { criarConta } = useApp();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const convite = params.get("convite");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    const novos: Record<string, string> = {};
    if (nome.trim().length < 3) novos.nome = "Escreva seu nome completo.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) novos.email = "E-mail inválido.";
    if (senha.length < 6) novos.senha = "A senha precisa de pelo menos 6 caracteres.";
    setErros(novos);
    if (Object.keys(novos).length) return;

    setEnviando(true);
    try {
      await criarConta(nome, email, senha);
      toast.success("Conta criada.");
      navegar(convite ? `/convite/${convite}` : "/", { replace: true });
    } catch (e) {
      setErros({ email: e instanceof RegraError ? e.message : "Não foi possível criar a conta." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <p className="mt-1 text-sm text-tinta-media">
        {convite
          ? "Depois de criar a conta você entra direto no bolão do convite."
          : "Com a conta criada você pode entrar em bolões por convite."}
      </p>

      <form onSubmit={submeter} className="mt-6 space-y-4" noValidate>
        <div>
          <Rotulo htmlFor="nome">Nome completo</Rotulo>
          <Campo id="nome" value={nome} erro={!!erros.nome} onChange={(e) => setNome(e.target.value)} data-testid="nome" />
          {erros.nome && <Erro>{erros.nome}</Erro>}
        </div>
        <div>
          <Rotulo htmlFor="email">E-mail</Rotulo>
          <Campo id="email" type="email" value={email} erro={!!erros.email}
            onChange={(e) => setEmail(e.target.value)} data-testid="email" />
          {erros.email && <Erro>{erros.email}</Erro>}
        </div>
        <div>
          <Rotulo htmlFor="senha" dica="mínimo de 6 caracteres">Senha</Rotulo>
          <Campo id="senha" type="password" value={senha} erro={!!erros.senha}
            onChange={(e) => setSenha(e.target.value)} data-testid="senha" />
          {erros.senha && <Erro>{erros.senha}</Erro>}
        </div>
        <Botao type="submit" className="w-full" disabled={enviando} data-testid="criar">
          {enviando ? "Criando…" : "Criar conta"}
        </Botao>
      </form>

      <p className="mt-4 text-center text-sm text-tinta-media">
        Já tem conta? <Link to="/entrar" className="font-semibold text-campo hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
