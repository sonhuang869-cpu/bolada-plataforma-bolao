import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Menu, RotateCcw, Shield, Ticket, Trophy, X } from "lucide-react";
import { useApp } from "@/estado";
import { ROTULO_PAPEL } from "@/lib/tipos";
import { cx } from "@/lib/cx";
import { Botao } from "./base";

export default function Layout() {
  const { usuario, sair, restaurar } = useApp();
  const u = usuario();
  const navegar = useNavigate();
  const [menu, setMenu] = useState(false);

  const links = [
    { para: "/", rotulo: "Meus bolões", Icone: Trophy },
    { para: "/entrar-em-bolao", rotulo: "Entrar com convite", Icone: Ticket },
    ...(u?.papel === "admin" ? [{ para: "/admin", rotulo: "Administração", Icone: Shield }] : []),
  ];

  const encerrar = async () => {
    await sair();
    navegar("/entrar");
    toast.success("Você saiu.");
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-linha bg-papel/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-sm bg-campo text-sm text-white">B</span>
            Bolada
          </Link>

          <nav className="ml-4 hidden gap-1 md:flex" aria-label="Principal">
            {links.map(({ para, rotulo }) => (
              <NavLink
                key={para}
                to={para}
                end={para === "/"}
                className={({ isActive }) =>
                  cx("rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-campo-claro text-campo" : "text-tinta-media hover:text-tinta")
                }
              >
                {rotulo}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {u && (
              <div className="hidden text-right sm:block">
                <p className="text-sm leading-tight font-semibold" data-testid="usuario-nome">{u.nome}</p>
                <p className="text-xs text-tinta-media">{ROTULO_PAPEL[u.papel]}</p>
              </div>
            )}
            <button
              onClick={async () => { await restaurar(); navegar("/entrar"); toast.success("Demonstração restaurada."); }}
              aria-label="Restaurar demonstração"
              title="Restaurar demonstração"
              data-testid="restaurar"
              className="hidden size-10 place-items-center rounded-sm text-tinta-fraca hover:text-tinta sm:grid"
            >
              <RotateCcw className="size-4" aria-hidden />
            </button>
            {u && (
              <Botao variante="fantasma" onClick={encerrar} data-testid="sair" className="hidden px-3 md:inline-flex">
                <LogOut className="size-4" aria-hidden /> Sair
              </Botao>
            )}
            <button
              onClick={() => setMenu((v) => !v)}
              aria-label={menu ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menu}
              data-testid="menu"
              className="grid size-10 place-items-center rounded-sm border border-linha md:hidden"
            >
              {menu ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            </button>
          </div>
        </div>

        {menu && (
          <nav className="border-t border-linha bg-cartao md:hidden" data-testid="menu-movel" aria-label="Principal">
            <ul className="mx-auto max-w-5xl px-2 py-2">
              {links.map(({ para, rotulo, Icone }) => (
                <li key={para}>
                  <NavLink
                    to={para}
                    end={para === "/"}
                    onClick={() => setMenu(false)}
                    className={({ isActive }) =>
                      cx("flex min-h-12 items-center gap-2 rounded-sm px-3 text-sm font-medium",
                        isActive ? "bg-campo-claro text-campo" : "text-tinta-media")
                    }
                  >
                    <Icone className="size-4" aria-hidden /> {rotulo}
                  </NavLink>
                </li>
              ))}
              <li className="mt-1 border-t border-linha pt-1">
                <button onClick={async () => { await restaurar(); setMenu(false); navegar("/entrar"); }}
                  className="flex min-h-12 w-full items-center gap-2 rounded-sm px-3 text-sm text-tinta-media">
                  <RotateCcw className="size-4" aria-hidden /> Restaurar demonstração
                </button>
              </li>
              {u && (
                <li>
                  <button onClick={() => { setMenu(false); encerrar(); }} data-testid="sair-movel"
                    className="flex min-h-12 w-full items-center gap-2 rounded-sm px-3 text-sm text-tinta-media">
                    <LogOut className="size-4" aria-hidden /> Sair
                  </button>
                </li>
              )}
            </ul>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-linha px-4 py-6">
        <p className="mx-auto max-w-5xl text-xs leading-relaxed text-tinta-fraca">
          Demonstração para avaliação. As pessoas, os times, os bolões e os valores são inventados,
          e os times não correspondem a clubes reais. Nenhum pagamento acontece: entrada, comissão,
          prêmio e estorno são lançamentos no extrato de cada bolão, e é esse extrato que fecha em
          zero quando o bolão é liquidado. Justin Gnoh · outubro de 2026
        </p>
      </footer>
    </div>
  );
}
