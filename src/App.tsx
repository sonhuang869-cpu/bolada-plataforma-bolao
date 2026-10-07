import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Entrar from "@/pages/Entrar";
import CriarConta from "@/pages/CriarConta";
import Convite, { EntrarEmBolao } from "@/pages/Convite";
import MeusBoloes from "@/pages/MeusBoloes";
import BolaoDetalhe from "@/pages/BolaoDetalhe";
import NovoBolao from "@/pages/NovoBolao";
import Admin from "@/pages/Admin";
import NaoEncontrado from "@/pages/NaoEncontrado";
import { useApp } from "@/estado";
import { Esqueleto } from "@/components/base";

/** Rota protegida: sem cadastro ativo não se vê nada, e o destino é guardado. */
function Protegida({ children }: { children: React.ReactNode }) {
  const { dados, carregando, usuario } = useApp();
  const local = useLocation();
  if (carregando || !dados) return <Esqueleto className="h-64" />;
  if (!usuario()) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  const carregar = useApp((e) => e.carregar);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/criar-conta" element={<CriarConta />} />
          <Route path="/convite/:codigo" element={<Convite />} />
          <Route path="/" element={<Protegida><MeusBoloes /></Protegida>} />
          <Route path="/entrar-em-bolao" element={<Protegida><EntrarEmBolao /></Protegida>} />
          <Route path="/novo-bolao" element={<Protegida><NovoBolao /></Protegida>} />
          <Route path="/bolao/:id" element={<Protegida><BolaoDetalhe /></Protegida>} />
          <Route path="/admin" element={<Protegida><Admin /></Protegida>} />
          <Route path="*" element={<NaoEncontrado />} />
        </Route>
      </Routes>
      <Toaster position="top-center" richColors closeButton />
    </>
  );
}
