"use client";
import Link from "next/link";
import { useState } from "react";
import { EXERCICES, NOM_MATERIEL } from "@/lib/exercices";
import { LISTE_MUSCLES, MUSCLES, type Muscle } from "@/lib/muscles";

export default function Catalogue() {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const liste = EXERCICES.filter((e) => (!muscle || e.cible === muscle || e.principaux.includes(muscle)) && (!q || norm(e.nom).includes(norm(q))));
  const groupes = LISTE_MUSCLES.map((m) => ({ m, exos: liste.filter((e) => e.cible === m) })).filter((g) => g.exos.length);
  return (
    <>
      <header className="entete"><p className="surtitre">{EXERCICES.length} exercices</p><h1>Exercices</h1></header>
      <input className="recherche" placeholder="Rechercher un exercice…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="puces defilement">
        <button className={`puce ${!muscle ? "active" : ""}`} onClick={() => setMuscle(null)}>Tous</button>
        {LISTE_MUSCLES.map((m) => <button key={m} className={`puce ${muscle === m ? "active" : ""}`} onClick={() => setMuscle(m)}>{MUSCLES[m].nom}</button>)}
      </div>
      {groupes.map((g) => (
        <section key={g.m}>
          <h2 className="titre-section">{MUSCLES[g.m].nom}</h2>
          <ul className="choix">
            {g.exos.map((e) => (
              <li key={e.id}>
                <Link href={`/exercices/${e.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/exos/${e.image}/0.jpg`} alt="" loading="lazy" />
                  <span><strong>{e.nom}</strong><small>{NOM_MATERIEL[e.materiel]} · {e.niveau === 1 ? "polyarticulaire lourd" : e.niveau === 2 ? "polyarticulaire" : "isolation"}</small></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
