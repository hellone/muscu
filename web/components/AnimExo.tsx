"use client";
// Démonstration de l'exercice : alterne la position de départ et d'arrivée.
import { useEffect, useState } from "react";
import { imageExo, type Exercice } from "@/lib/exercices";

export default function AnimExo({ exo, petit = false }: { exo: Exercice; petit?: boolean }) {
  const [n, setN] = useState<0 | 1>(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x ? 0 : 1)), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={`anim ${petit ? "anim-petit" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageExo(exo, 0)} alt={`${exo.nom} – départ`} style={{ opacity: n === 0 ? 1 : 0 }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageExo(exo, 1)} alt={`${exo.nom} – arrivée`} style={{ opacity: n === 1 ? 1 : 0 }} />
      {!petit && <span className="anim-etape">{n === 0 ? "Départ" : "Arrivée"}</span>}
    </div>
  );
}
