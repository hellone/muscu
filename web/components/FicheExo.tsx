"use client";
import { useEffect, useState } from "react";
import AnimExo from "./AnimExo";
import Corps from "./Corps";
import Courbe from "./Courbe";
import { api, fmtDate, fmtPoids } from "@/lib/client";
import type { SerieFaite } from "@/lib/coach";
import { EXERCICES_PAR_ID, NOM_MATERIEL } from "@/lib/exercices";
import { MUSCLES } from "@/lib/muscles";

interface Point { date: string; series: SerieFaite[]; meilleure: SerieFaite; unRM: number }

export default function FicheExo({ id }: { id: string }) {
  const e = EXERCICES_PAR_ID[id];
  const [points, setPoints] = useState<Point[] | null>(null);
  useEffect(() => { api<Point[]>(`/api/exercices/${id}`).then(setPoints).catch(() => setPoints([])); }, [id]);
  const avecCharge = (points ?? []).some((p) => (p.meilleure.poids ?? 0) > 0);
  const record = points?.length ? points.reduce((m, p) => (p.unRM > m.unRM ? p : m), points[0]) : null;
  return (
    <>
      <button className="retour" onClick={() => history.back()}>← Retour</button>
      <header className="entete"><p className="surtitre">{NOM_MATERIEL[e.materiel]} · {e.reps[0]}–{e.reps[1]} {e.unite === "sec" ? "secondes" : "reps"} · {e.series} séries</p><h1>{e.nom}</h1></header>
      <AnimExo exo={e} />
      <section className="carte">
        <h2 className="titre-section">Bien l&apos;exécuter</h2>
        <ol className="consignes">{e.consignes.map((c) => <li key={c}>{c}</li>)}</ol>
      </section>
      <section className="carte">
        <h2 className="titre-section">Muscles ciblés</h2>
        <Corps principaux={e.principaux} secondaires={e.secondaires} />
        <div className="muscles-liste">
          <p><i style={{ background: "var(--accent)" }} />Principaux : {e.principaux.map((m) => MUSCLES[m].nom).join(", ")}</p>
          {e.secondaires.length > 0 && <p><i style={{ background: "var(--accent-doux)" }} />Secondaires : {e.secondaires.map((m) => MUSCLES[m].nom).join(", ")}</p>}
        </div>
      </section>
      <section className="carte">
        <h2 className="titre-section">Ma progression</h2>
        {points === null && <p className="discret">Chargement…</p>}
        {points?.length === 0 && <p className="discret">Pas encore fait. Ta courbe apparaîtra après ta première séance.</p>}
        {points && points.length > 0 && (
          <>
            {record && avecCharge && <p className="record">Meilleure série : <strong>{fmtPoids(record.meilleure.poids)} kg × {record.meilleure.reps}</strong> <small>({fmtDate(record.date, false)} · 1RM estimé {fmtPoids(record.unRM)} kg)</small></p>}
            {points.length > 1 && <Courbe points={points.map((p) => ({ x: p.date, y: avecCharge ? p.unRM : p.meilleure.reps }))} unite={avecCharge ? "kg (1RM estimé)" : e.unite === "sec" ? "secondes" : "reps"} />}
            <ul className="seances-exo">
              {[...points].reverse().slice(0, 12).map((p) => (
                <li key={p.date}><span>{fmtDate(p.date)}</span><span>{p.series.map((s) => (s.poids !== null ? `${fmtPoids(s.poids)}×${s.reps}` : s.reps)).join(" · ")}</span></li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
