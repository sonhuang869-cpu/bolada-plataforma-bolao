import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";

export default function NaoEncontrado() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <SearchX className="size-10 text-tinta-fraca" aria-hidden />
      <h1 className="text-xl font-bold">Esta página não existe</h1>
      <p className="max-w-sm text-sm text-tinta-media">
        O endereço que você abriu não corresponde a nenhum bolão ou tela do sistema.
      </p>
      <Link to="/" className="mt-1 inline-flex min-h-11 items-center rounded-sm bg-campo px-4 text-sm font-semibold text-white hover:bg-campo/90">
        Ir para meus bolões
      </Link>
    </div>
  );
}
