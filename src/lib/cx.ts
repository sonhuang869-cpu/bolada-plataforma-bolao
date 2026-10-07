import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Sem o merge, `w-16` passado por quem chama não vence o `w-full` que o
 * componente já tem: as duas classes existem e quem ganha é a ordem na folha
 * de estilo. O efeito foi um campo de placar ocupando a linha inteira no
 * telefone, com o "×" sobrando embaixo.
 */
export const cx = (...p: ClassValue[]) => twMerge(clsx(p));
