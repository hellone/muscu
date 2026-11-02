"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Corps from "@/components/Corps";
import { api, demarrerSeance, lireSeance, useSeance } from "@/lib/client";
import type { PlanExo, Recuperation, Suggestion } from "@/lib/coach";
import { CIBLES, LISTE_MUSCLES, MUSCLES, type CibleId } from "@/lib/muscles";

interface Coach { recuperation: Recuperation; suggestions: Suggestion[]; nbSeances: number }

export default function Accueil() {
  const router = useRouter();
  const seance = useSeance();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [erreur, setErreur] = useState("");
  const [lancement, setLancement] = useState<CibleId | "libre" | null>(null);
  const [toutes, setToutes] = useState(false);

  useEffect(() => {
    api<Coach>("/api/coach").then(setCoach).catch((e) => setErreur(e.message));
  }, []);

  async function lancer(cible: CibleId | "libre") {
    if (lireSeance() && !confirm("Une séance est déjà en cours. La remplacer ?")) return;
    setLancement(cible);
    try {
      const r = await api<{ plan: PlanExo[] }>("/api/coach/seance", { method: "POST", json: { cible } });
      demarrerSeance(cible, cible === "libre" ? "Séance libre" : CIBLES[cible].nom, r.plan);
      router.push("/seance");
    } catch (e) {
      setErreur((e as Error).message);
      setLancement(null);
    }
  }

  const top = coach?.suggestions.slice(0, 3) ?? [];
  const autres = coach?.suggestions.slice(3) ?? [];
  const fatigues = coach
    ? LISTE_MUSCLES.filter((m) => coach.recuperation[m].derniere && coach.recuperation[m].pct < 85).sort((a, b) => coach.recuperation[a].pct - coach.recuperation[b].pct)
    : [];

  return (
    <>
      <header className="entete">
        <p className="surtitre majuscule">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1>Aujourd&apos;hui</h1>
      </header>

      {seance && (
        <Link href="/seance" className="bandeau-seance">
          <div><small>Séance en cours</small><strong>{seance.nomCible}</strong></div>
          <span>Reprendre →</span>
        </Link>
      )}

      {erreur && <p className="erreur">{erreur}</p>}

      <section>
        <h2 className="titre-section">{coach?.nbSeances ? "Je te propose" : "Pour ta première séance"}</h2>
        {!coach && !erreur && <div className="carte squelette" style={{ height: 240 }} />}
        <div className="suggestions">
          {top.map((s, i) => (
            <button key={s.cible} className={`suggestion ${i === 0 ? "premiere" : ""} ${s.pret ? "" : "pas-prete"}`} onClick={() => lancer(s.cible)} disabled={!!lancement}>
              <div className="suggestion-texte">
                {i === 0 && <span className="etiquette">Conseillé</span>}
                <strong>{s.nom}</strong>
                <small>{s.raison}</small>
              </div>
              <div className="suggestion-jauge" aria-label={`Récupération ${s.recup} %`}>
                <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" className="fond" /><circle cx="18" cy="18" r="15.5" className="valeur" strokeDasharray={`${(s.recup / 100) * 97.4} 97.4`} /></svg>
                <span>{lancement === s.cible ? "…" : `${s.recup}%`}</span>
              </div>
            </button>
          ))}
        </div>
        {autres.length > 0 && (
          <>
            <button className="lien-discret" onClick={() => setToutes(!toutes)}>{toutes ? "Masquer" : "Autre chose en tête ?"}</button>
            {toutes && (
              <div className="puces">
                {autres.map((s) => (
                  <button key={s.cible} className={`puce ${s.pret ? "" : "pas-prete"}`} onClick={() => lancer(s.cible)} disabled={!!lancement}>
                    {s.nom} <small>{s.recup}%</small>
                  </button>
                ))}
                <button className="puce" onClick={() => lancer("libre")} disabled={!!lancement}>Séance libre</button>
              </div>
            )}
          </>
        )}
      </section>

      {coach && (
        <section className="carte">
          <h2 className="titre-section">Récupération</h2>
          <Corps recup={coach.recuperation} />
          <div className="legende">
            <span><i style={{ background: "var(--fatigue-forte)" }} />Fatigué</span>
            <span><i style={{ background: "var(--fatigue-moyenne)" }} />En cours</span>
            <span><i style={{ background: "var(--recupere)" }} />Prêt</span>
          </div>
          {fatigues.length > 0 ? (
            <ul className="liste-recup">
              {fatigues.map((m) => (
                <li key={m}>
                  <span>{MUSCLES[m].nom}</span>
                  <div className="barre"><div style={{ width: `${coach.recuperation[m].pct}%`, background: coach.recuperation[m].pct < 50 ? "var(--fatigue-forte)" : "var(--fatigue-moyenne)" }} /></div>
                  <small>{coach.recuperation[m].pct}%</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="discret">{coach.nbSeances ? "Tous tes muscles sont récupérés." : "Ta carte se remplira au fil de tes séances."}</p>
          )}
        </section>
      )}
    </>
  );
}
