import { create } from "zustand";
import * as api from "@/lib/api";
import type { Dados, Usuario } from "@/lib/tipos";

interface Estado {
  dados: Dados | null;
  carregando: boolean;
  carregar: () => Promise<void>;
  atualizar: (d: Dados) => void;
  usuario: () => Usuario | null;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  criarConta: (nome: string, email: string, senha: string) => Promise<Usuario>;
  sair: () => Promise<void>;
  restaurar: () => Promise<void>;
}

export const useApp = create<Estado>((set, get) => ({
  dados: null,
  carregando: true,

  carregar: async () => {
    set({ carregando: true });
    try {
      set({ dados: await api.obterDados() });
    } finally {
      set({ carregando: false });
    }
  },

  atualizar: (d) => set({ dados: d }),

  usuario: () => {
    const d = get().dados;
    if (!d?.sessaoId) return null;
    return d.usuarios.find((u) => u.id === d.sessaoId) ?? null;
  },

  entrar: async (email, senha) => {
    const u = await api.entrar(email, senha);
    set({ dados: await api.obterDados() });
    return u;
  },

  criarConta: async (nome, email, senha) => {
    const u = await api.criarConta(nome, email, senha);
    set({ dados: await api.obterDados() });
    return u;
  },

  sair: async () => {
    await api.sair();
    set({ dados: await api.obterDados() });
  },

  restaurar: async () => {
    set({ dados: await api.restaurar() });
  },
}));

/** Recarrega do armazenamento depois de qualquer escrita. */
export async function recarregar(): Promise<void> {
  useApp.getState().atualizar(await api.obterDados());
}
