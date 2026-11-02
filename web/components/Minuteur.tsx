"use client";
// Minuteur de repos entre deux séries (vibre à la fin si le téléphone le permet).
import { useEffect, useState } from "react";

export default function Minuteur({ fin, total, onFermer, onAjouter }: { fin: number; total: number; onFermer: () => void; onAjouter: (s: number) => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const reste = Math.max(0, Math.ceil((fin - now) / 1000));
  useEffect(() => {
    if (reste === 0) { try { navigator.vibrate?.([200, 100, 200]); } catch { /* */ } }
  }, [reste]);
  const pct = Math.min(100, ((total - reste) / total) * 100);
  return (
    <div className={`minuteur ${reste === 0 ? "fini" : ""}`}>
      <div className="minuteur-barre" style={{ width: `${pct}%` }} />
      <div className="minuteur-contenu">
        <span>{reste === 0 ? "C'est reparti !" : "Repos"}</span>
        <strong>{Math.floor(reste / 60)}:{String(reste % 60).padStart(2, "0")}</strong>
        <button onClick={() => onAjouter(30)}>+30 s</button>
        <button onClick={onFermer}>{reste === 0 ? "OK" : "Passer"}</button>
      </div>
    </div>
  );
}
