import { useEffect, useState } from "react";

/**
 * O relógio como estado, não como leitura durante o render.
 *
 * O prazo de um bolão é o relógio, então a tela precisa reagir a ele: com a
 * página aberta às 15h29, o apito das 15h30 tem que fechar o formulário sozinho.
 * Lendo Date.now() no meio do render isso só acontecia se alguma outra coisa
 * provocasse um novo render, o que podia nunca acontecer.
 */
export function useRelogio(intervaloMs = 20000): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return agora;
}
