import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { X } from "lucide-react";
import { cx } from "@/lib/cx";

type Variante = "primario" | "perigo" | "contorno" | "fantasma";

const VARIANTE: Record<Variante, string> = {
  primario: "bg-campo text-white hover:bg-campo/90",
  perigo: "bg-perigo text-white hover:bg-perigo/90",
  contorno: "border border-linha bg-cartao text-tinta hover:border-tinta-fraca",
  fantasma: "text-tinta-media hover:bg-campo-claro hover:text-tinta",
};

export function Botao({ variante = "primario", className, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold",
        "transition-colors disabled:pointer-events-none disabled:opacity-45",
        VARIANTE[variante], className,
      )}
    />
  );
}

export function Campo({ className, erro, ...props }:
  InputHTMLAttributes<HTMLInputElement> & { erro?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={erro || undefined}
      className={cx(
        "min-h-11 w-full rounded-sm border bg-cartao px-3 text-[15px] text-tinta",
        "placeholder:text-tinta-fraca focus:outline-none",
        erro ? "border-perigo focus:border-perigo" : "border-linha focus:border-campo",
        className,
      )}
    />
  );
}

export function Selecao({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx("min-h-11 w-full rounded-sm border border-linha bg-cartao px-3 text-[15px] text-tinta focus:border-campo focus:outline-none", className)}
    />
  );
}

export function Rotulo({ children, htmlFor, dica }: { children: ReactNode; htmlFor: string; dica?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
      {children}
      {dica && <span className="mt-0.5 block text-xs font-normal text-tinta-media">{dica}</span>}
    </label>
  );
}

export function Erro({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-perigo" role="alert">{children}</p>;
}

type Tom = "neutro" | "campo" | "dinheiro" | "perigo";
const TOM: Record<Tom, string> = {
  neutro: "border-linha bg-papel text-tinta-media",
  campo: "border-campo/25 bg-campo-claro text-campo",
  dinheiro: "border-dinheiro/25 bg-dinheiro-claro text-dinheiro",
  perigo: "border-perigo/20 bg-perigo-claro text-perigo",
};

export function Selo({ children, tom = "neutro", className }: { children: ReactNode; tom?: Tom; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", TOM[tom], className)}>
      {children}
    </span>
  );
}

/** Dinheiro tem cor própria e tipografia própria. Nada mais usa as duas. */
export function Valor({ children, grande, className, ...resto }:
  { children: ReactNode; grande?: boolean; className?: string } & Record<string, unknown>) {
  return (
    <span {...resto} className={cx("mono font-semibold text-dinheiro", grande ? "text-2xl" : "text-sm", className)}>
      {children}
    </span>
  );
}

export function Dialogo({ aberto, aoFechar, titulo, descricao, children, testid }: {
  aberto: boolean; aoFechar: () => void; titulo: string; descricao?: string; children: ReactNode; testid?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    if (!aberto && el.open) el.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => { if (e.target === ref.current) aoFechar(); }}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-md border border-linha bg-cartao p-0 text-tinta backdrop:bg-tinta/40"
      data-testid={testid}
    >
      {aberto && (
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">{titulo}</h2>
              {descricao && <p className="mt-1 text-sm text-tinta-media">{descricao}</p>}
            </div>
            <button onClick={aoFechar} aria-label="Fechar" className="-m-1 rounded-sm p-1 text-tinta-fraca hover:text-tinta">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-linha px-6 py-12 text-center">
      <p className="font-medium">{titulo}</p>
      {children && <div className="mt-1 text-sm text-tinta-media">{children}</div>}
    </div>
  );
}

export function Esqueleto({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-sm bg-linha/70", className)} />;
}

export function Abas<T extends string>({ valor, aoMudar, opcoes }: {
  valor: T; aoMudar: (v: T) => void; opcoes: { valor: T; rotulo: string }[];
}) {
  return (
    <div className="sem-barra -mx-4 flex gap-1 overflow-x-auto px-4" role="tablist">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          role="tab"
          aria-selected={valor === o.valor}
          onClick={() => aoMudar(o.valor)}
          data-testid={`aba-${o.valor}`}
          className={cx(
            "shrink-0 rounded-sm px-3 py-2 text-sm font-semibold transition-colors",
            valor === o.valor ? "bg-tinta text-papel" : "text-tinta-media hover:bg-campo-claro",
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
