"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { EXERCICES, NOM_MATERIEL, disponible, type Equipement } from "@/lib/exercices";
import { GROUPES, MUSCLES } from "@/lib/muscles";

export default function Catalogue() {
  const [q, setQ] = useState("");
  const [groupe, setGroupe] = useState<string | null>(null);
  const [equipement, setEquipement] = useState<Equipement[] | null>(null);
  const [monMateriel, setMonMateriel] = useState(false);
  useEffect(() => { api<{ equipement: Equipement[] }>("/api/compte").then((u) => setEquipement(u.equipement)).catch(() => {}); }, []);
  const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const filtres = EXERCICES.filter((e) => (!q || norm(e.nom).includes(norm(q))) && (!monMateriel || !equipement || disponible(e, equipement)));
  const groupes = GROUPES.filter((g) => !groupe || g.nom === groupe);
  return (
    <>
      <header className="entete"><p className="surtitre">{EXERCICES.length} exercices · 17 muscles</p><h1>Exercices</h1></header>
      <input className="recherche" placeholder="Rechercher un exercice…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="puces">
        <button className={`puce ${!groupe ? "active" : ""}`} onClick={() => setGroupe(null)}>Tous</button>
        {GROUPES.map((g) => <button key={g.nom} className={`puce ${groupe === g.nom ? "active" : ""}`} onClick={() => setGroupe(g.nom)}>{g.nom}</button>)}
      </div>
      {equipement && (
        <label className="interrupteur"><input type="checkbox" checked={monMateriel} onChange={(e) => setMonMateriel(e.target.checked)} /> Seulement avec mon matériel</label>
      )}
      {groupes.map((g) => {
        const sections = g.muscles.map((m) => ({ m, exos: filtres.filter((e) => e.cible === m) })).filter((s) => s.exos.length);
        if (!sections.length) return null;
        return (
          <section key={g.nom} className="groupe">
            <h2 className="titre-groupe">{g.nom}</h2>
            {sections.map((s) => (
              <div key={s.m}>
                {g.muscles.length > 1 && <h3 className="titre-section">{MUSCLES[s.m].nom}</h3>}
                <ul className="choix">
                  {s.exos.map((e) => (
                    <li key={e.id}>
                      <Link href={`/exercices/${e.id}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/exos/${e.image}/0.jpg`} alt="" loading="lazy" />
                        <span><strong>{e.nom}</strong><small>{NOM_MATERIEL[e.materiel]} · {e.niveau === 1 ? "polyarticulaire lourd" : e.niveau === 2 ? "polyarticulaire" : "isolation"}</small></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}
