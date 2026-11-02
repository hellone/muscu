"use client";
// Panneau qui monte du bas de l'écran (choix d'un exercice, d'une date…).
export default function Feuille({ titre, onFermer, children }: { titre: string; onFermer: () => void; children: React.ReactNode }) {
  return (
    <div className="voile" onClick={onFermer}>
      <div className="feuille" onClick={(e) => e.stopPropagation()}>
        <header><h2>{titre}</h2><button onClick={onFermer} aria-label="Fermer">✕</button></header>
        <div className="feuille-contenu">{children}</div>
      </div>
    </div>
  );
}
