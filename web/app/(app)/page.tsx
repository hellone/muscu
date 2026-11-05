"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Corps from "@/components/Corps";
import { api, demarrerSeance, type OptionsSeance, lireSeance, useSeance } from "@/lib/client";
import type { InfoCycle, PlanExo, Recuperation, Suggestion } from "@/lib/coach";
import { CIBLES, GROUPES, LISTE_MUSCLES, MUSCLES, type CibleId, type Muscle } from "@/lib/muscles";

interface Coach {
  recuperation: Recuperation; suggestions: Suggestion[]; nbSeances: number;
  volume: Record<Muscle, number>; objectifs: Record<Muscle, number>; priorites: Muscle[];
  regularite: { semaines: number; cetteSemaine: number; objectif: number }; cycle: InfoCycle | null;
}

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
      const r = await api<{ plan: PlanExo[]; options: OptionsSeance }>("/api/coach/seance", { method: "POST", json: { cible } });
      demarrerSeance(cible, cible === "libre" ? "Séance libre" : CIBLES[cible].nom, r.plan, undefined, r.options);
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

      {coach && (
        <div className="tuiles">
          <div className="tuile">
            <strong>🔥 {coach.regularite.semaines}</strong>
            <small>semaine{coach.regularite.semaines > 1 ? "s" : ""} d&apos;affilée à {coach.regularite.objectif}+ séances</small>
          </div>
          <div className="tuile">
            <strong>{coach.regularite.cetteSemaine}/{coach.regularite.objectif}</strong>
            <small>séances cette semaine</small>
          </div>
          {coach.cycle && (
            <div className={`tuile ${coach.cycle.decharge ? "decharge" : ""}`}>
              <strong>{coach.cycle.decharge ? "🧘" : `S${coach.cycle.semaine}/${coach.cycle.total}`}</strong>
              <small>{coach.cycle.decharge ? "semaine de décharge" : `cycle · RIR ${coach.cycle.rirCible}`}</small>
            </div>
          )}
        </div>
      )}

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

      {coach && coach.nbSeances > 0 && <VolumeSemaine coach={coach} />}

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

function VolumeSemaine({ coach }: { coach: Coach }) {
  const [tout, setTout] = useState(false);
  // muscles affichés : prioritaires + ceux déjà travaillés cette semaine (ou tous)
  const groupes = GROUPES.map((g) => ({
    nom: g.nom,
    muscles: g.muscles.filter((m) => tout || coach.priorites.includes(m) || coach.volume[m] > 0),
  })).filter((g) => g.muscles.length);
  return (
    <section className="carte">
      <h2 className="titre-section">Volume de la semaine <small>séries par muscle</small></h2>
      {groupes.length === 0 && <p className="discret">Aucune série depuis lundi.</p>}
      {groupes.map((g) => (
        <div key={g.nom} className="volume-groupe">
          <h3>{g.nom}</h3>
          <ul className="liste-volume">
            {g.muscles.map((m) => {
              const v = coach.volume[m], o = coach.objectifs[m];
              return (
                <li key={m} className={v >= o ? "atteint" : ""}>
                  <span>{MUSCLES[m].nom}{coach.priorites.includes(m) && <b title="Prioritaire"> ★</b>}</span>
                  <div className="barre"><div style={{ width: `${Math.min(100, (v / o) * 100)}%` }} /></div>
                  <small>{String(v).replace(".", ",")}/{o}</small>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <button className="lien-discret" onClick={() => setTout(!tout)}>{tout ? "Masquer les muscles non travaillés" : "Voir tous les muscles"}</button>
    </section>
  );
}
