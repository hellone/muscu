"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AnimExo from "@/components/AnimExo";
import Minuteur from "@/components/Minuteur";
import Saisie from "@/components/Saisie";
import { api, ErreurApi, ecrireSeance, envoyerSeance, fmtDate, fmtPoids, ilYa, lireSeance, useSeance, versEnvoi, type ExoLocal, type SeanceLocale } from "@/lib/client";
import type { PlanExo } from "@/lib/coach";
import { EXERCICES, EXERCICES_PAR_ID, NOM_MATERIEL } from "@/lib/exercices";
import { LISTE_MUSCLES, MUSCLES, type Muscle } from "@/lib/muscles";

type Fin = { enregistre: boolean; series: number; tonnage: number; duree: number; progres: { nom: string; texte: string }[] };

/** Modifie la séance en cours (copie, modification, enregistrement sur le téléphone). */
function modifier(fn: (s: SeanceLocale) => void) {
  const s = lireSeance();
  if (!s) return;
  const copie: SeanceLocale = structuredClone(s);
  fn(copie);
  ecrireSeance(copie);
}

export default function PageSeance() {
  const seance = useSeance();
  const [repos, setRepos] = useState<{ fin: number; total: number } | null>(null);
  const [remplacement, setRemplacement] = useState<number | null>(null);
  const [ajout, setAjout] = useState(false);
  const [fin, setFin] = useState<Fin | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [, tic] = useState(0);
  useEffect(() => { const t = setInterval(() => tic((x) => x + 1), 30_000); return () => clearInterval(t); }, []);

  if (fin) return <Bilan fin={fin} />;

  if (!seance) {
    return (
      <div className="vide">
        <h1>Pas de séance en cours</h1>
        <p>Choisis ce que tu veux travailler : je construis l&apos;enchaînement optimal.</p>
        <Link href="/" className="bouton principal">Voir les propositions du jour</Link>
      </div>
    );
  }

  const total = seance.exos.reduce((t, e) => t + e.series.length, 0);
  const faites = seance.exos.reduce((t, e) => t + e.series.filter((s) => s.fait).length, 0);
  const minutes = Math.round((Date.now() - Date.parse(seance.debut)) / 60_000);

  function validerSerie(i: number, j: number) {
    const exo = seance!.exos[i];
    const deja = exo.series[j].fait;
    modifier((s) => {
      const e = s.exos[i];
      e.series[j].fait = !deja;
      if (!deja) {
        // la série suivante reprend la charge saisie si elle n'en avait pas
        const suiv = e.series[j + 1];
        if (suiv && !suiv.fait && suiv.poids === null) suiv.poids = e.series[j].poids;
        if (e.series.every((x) => x.fait)) {
          const prochain = s.exos.findIndex((x, k) => k > i && x.series.some((y) => !y.fait));
          if (prochain >= 0) s.actif = prochain;
        }
      }
    });
    if (!deja) setRepos({ fin: Date.now() + exo.repos * 1000, total: exo.repos });
  }

  async function terminer() {
    const s = lireSeance();
    if (!s) return;
    const envoiData = versEnvoi(s);
    if (!envoiData.exercices.length) {
      if (confirm("Aucune série validée. Abandonner la séance ?")) ecrireSeance(null);
      return;
    }
    if (faites < total && !confirm(`Il reste ${total - faites} série(s) non validée(s). Terminer quand même ?`)) return;
    setEnvoi(true); setErreur("");
    try {
      const enregistre = await envoyerSeance(envoiData);
      const series = envoiData.exercices.flatMap((e) => e.series);
      const progres = s.exos.flatMap((e) => {
        const ex = EXERCICES_PAR_ID[e.exerciceId];
        const faitesE = e.series.filter((x) => x.fait);
        if (!ex || !faitesE.length || !e.derniere) return [];
        const maxNow = Math.max(...faitesE.map((x) => x.poids ?? 0));
        const maxAvant = Math.max(...e.derniere.series.map((x) => x.poids ?? 0));
        const repsNow = faitesE.reduce((t, x) => t + x.reps, 0);
        const repsAvant = e.derniere.series.reduce((t, x) => t + x.reps, 0);
        if (maxNow > maxAvant) return [{ nom: ex.nom, texte: `+${fmtPoids(Math.round((maxNow - maxAvant) * 100) / 100)} kg` }];
        if (maxNow === maxAvant && repsNow > repsAvant) return [{ nom: ex.nom, texte: `+${repsNow - repsAvant} reps` }];
        return [];
      });
      ecrireSeance(null);
      setFin({ enregistre, series: series.length, tonnage: Math.round(series.reduce((t, x) => t + (x.poids ?? 0) * x.reps, 0)), duree: minutes, progres });
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      <header className="entete entete-seance">
        <div>
          <p className="surtitre">{minutes} min · {faites}/{total} séries</p>
          <h1>{seance.nomCible}</h1>
        </div>
        <button className="bouton discret" onClick={() => confirm("Abandonner cette séance ? Rien ne sera enregistré.") && ecrireSeance(null)}>Abandonner</button>
      </header>
      <div className="progression"><div style={{ width: `${total ? (faites / total) * 100 : 0}%` }} /></div>

      <ol className="exos">
        {seance.exos.map((e, i) => (
          <CarteExo
            key={`${e.exerciceId}-${i}`}
            exo={e}
            index={i}
            ouvert={seance.actif === i}
            onOuvrir={() => modifier((s) => { s.actif = s.actif === i ? -1 : i; })}
            onValider={(j) => validerSerie(i, j)}
            onSerie={(j, champ, v) => modifier((s) => { (s.exos[i].series[j] as any)[champ] = champ === "reps" ? Math.round(v ?? 0) : v; })}
            onAjouterSerie={() => modifier((s) => { const d = s.exos[i].series.at(-1); s.exos[i].series.push({ poids: d?.poids ?? null, reps: d?.reps ?? 10, fait: false }); })}
            onRetirerSerie={() => modifier((s) => { const l = s.exos[i].series; if (l.length > 1 && !l.at(-1)!.fait) l.pop(); })}
            onRemplacer={() => setRemplacement(i)}
            onRetirer={() => confirm(`Retirer « ${EXERCICES_PAR_ID[e.exerciceId]?.nom} » de la séance ?`) && modifier((s) => { s.exos.splice(i, 1); s.actif = Math.min(s.actif, s.exos.length - 1); })}
            onMonter={i > 0 ? () => modifier((s) => { [s.exos[i - 1], s.exos[i]] = [s.exos[i], s.exos[i - 1]]; s.actif = i - 1; }) : undefined}
          />
        ))}
      </ol>

      <button className="bouton secondaire large" onClick={() => setAjout(true)}>+ Ajouter un exercice</button>
      {erreur && <p className="erreur">{erreur}</p>}
      <button className="bouton principal large" onClick={terminer} disabled={envoi}>{envoi ? "Enregistrement…" : "Terminer la séance"}</button>

      {repos && (
        <Minuteur fin={repos.fin} total={repos.total} onFermer={() => setRepos(null)} onAjouter={(s) => setRepos({ fin: repos.fin + s * 1000, total: repos.total + s })} />
      )}
      {remplacement !== null && seance.exos[remplacement] && (
        <Remplacement
          exo={seance.exos[remplacement]}
          dans={seance.exos.map((x) => x.exerciceId)}
          onChoisir={(p) => { modifier((s) => { s.exos[remplacement] = { ...p, series: p.series.map((x) => ({ ...x, fait: false })) }; s.actif = remplacement; }); setRemplacement(null); }}
          onFermer={() => setRemplacement(null)}
        />
      )}
      {ajout && (
        <Ajout
          dans={seance.exos.map((x) => x.exerciceId)}
          onChoisir={(p) => { modifier((s) => { s.exos.push({ ...p, series: p.series.map((x) => ({ ...x, fait: false })) }); s.actif = s.exos.length - 1; }); setAjout(false); }}
          onFermer={() => setAjout(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- carte d'un exercice

function CarteExo(p: {
  exo: ExoLocal; index: number; ouvert: boolean;
  onOuvrir: () => void; onValider: (j: number) => void; onSerie: (j: number, champ: "poids" | "reps", v: number | null) => void;
  onAjouterSerie: () => void; onRetirerSerie: () => void; onRemplacer: () => void; onRetirer: () => void; onMonter?: () => void;
}) {
  const ex = EXERCICES_PAR_ID[p.exo.exerciceId];
  if (!ex) return null;
  const faites = p.exo.series.filter((s) => s.fait).length;
  const fini = faites === p.exo.series.length;
  const sec = ex.unite === "sec";
  const lest = ex.increment === 0;
  return (
    <li className={`exo ${p.ouvert ? "ouvert" : ""} ${fini ? "fini" : ""}`}>
      <button className="exo-tete" onClick={p.onOuvrir}>
        <span className="exo-num">{fini ? "✓" : p.index + 1}</span>
        <span className="exo-titre">
          <strong>{ex.nom}</strong>
          <small>{faites}/{p.exo.series.length} séries · {ex.reps[0]}–{ex.reps[1]}{sec ? " s" : " reps"} · {MUSCLES[ex.cible].nom}</small>
        </span>
        <span className="chevron">{p.ouvert ? "▴" : "▾"}</span>
      </button>
      {p.ouvert && (
        <div className="exo-corps">
          <div className="exo-visuel">
            <AnimExo exo={ex} petit />
            <div>
              <p className="pourquoi">{p.exo.raison}</p>
              <Link href={`/exercices/${ex.id}`} className="lien-discret">Comment le faire · muscles →</Link>
            </div>
          </div>
          <div className="historique-exo">
            {p.exo.derniere ? (
              <p><span>Dernière fois ({ilYa(p.exo.derniere.date)}) :</span> {p.exo.derniere.series.map((s) => (s.poids !== null ? `${fmtPoids(s.poids)}×${s.reps}` : `${s.reps}`)).join(" · ")}</p>
            ) : <p><span>Nouvel exercice</span></p>}
            <p className="objectif">🎯 {p.exo.objectif}</p>
          </div>
          <table className="series">
            <thead><tr><th>#</th><th>{lest ? "Lest (kg)" : "Charge (kg)"}</th><th>{sec ? "Secondes" : "Reps"}</th><th /></tr></thead>
            <tbody>
              {p.exo.series.map((s, j) => (
                <tr key={j} className={s.fait ? "faite" : ""}>
                  <td>{j + 1}</td>
                  <td><Saisie valeur={s.poids} onChange={(v) => p.onSerie(j, "poids", v)} pas={ex.increment || 2.5} placeholder={lest ? "0" : "kg"} /></td>
                  <td><Saisie valeur={s.reps} onChange={(v) => p.onSerie(j, "reps", v)} pas={sec ? 5 : 1} /></td>
                  <td><button className={`valider ${s.fait ? "ok" : ""}`} onClick={() => p.onValider(j)} aria-label="Valider la série">✓</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="exo-actions">
            <button onClick={p.onAjouterSerie}>+ Série</button>
            <button onClick={p.onRetirerSerie}>− Série</button>
            <button onClick={p.onRemplacer}>Remplacer</button>
            {p.onMonter && <button onClick={p.onMonter}>Monter</button>}
            <button onClick={p.onRetirer} className="danger">Retirer</button>
          </div>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- remplacer / ajouter

function Feuille({ titre, onFermer, children }: { titre: string; onFermer: () => void; children: React.ReactNode }) {
  return (
    <div className="voile" onClick={onFermer}>
      <div className="feuille" onClick={(e) => e.stopPropagation()}>
        <header><h2>{titre}</h2><button onClick={onFermer} aria-label="Fermer">✕</button></header>
        <div className="feuille-contenu">{children}</div>
      </div>
    </div>
  );
}

function ListeChoix({ plans, onChoisir }: { plans: PlanExo[]; onChoisir: (p: PlanExo) => void }) {
  return (
    <ul className="choix">
      {plans.map((pl) => {
        const e = EXERCICES_PAR_ID[pl.exerciceId];
        return (
          <li key={pl.exerciceId}>
            <button onClick={() => onChoisir(pl)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/exos/${e.image}/0.jpg`} alt="" loading="lazy" />
              <span><strong>{e.nom}</strong><small>{NOM_MATERIEL[e.materiel]}{pl.derniere ? ` · déjà fait ${ilYa(pl.derniere.date)}` : ""}</small></span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Remplacement({ exo, dans, onChoisir, onFermer }: { exo: ExoLocal; dans: string[]; onChoisir: (p: PlanExo) => void; onFermer: () => void }) {
  const [plans, setPlans] = useState<PlanExo[] | null>(null);
  const [erreur, setErreur] = useState("");
  const cle = dans.join(",");
  useEffect(() => {
    api<PlanExo[]>(`/api/coach/alternatives?exo=${exo.exerciceId}&dans=${cle}`).then(setPlans)
      .catch((e) => setErreur(e instanceof ErreurApi ? e.message : "Pas de réseau : impossible de charger les alternatives."));
  }, [exo.exerciceId, cle]);
  return (
    <Feuille titre={`Remplacer ${EXERCICES_PAR_ID[exo.exerciceId]?.nom ?? ""}`} onFermer={onFermer}>
      {erreur && <p className="erreur">{erreur}</p>}
      {!plans && !erreur && <p className="discret">Chargement…</p>}
      {plans && (plans.length ? <ListeChoix plans={plans} onChoisir={onChoisir} /> : <p className="discret">Aucune alternative avec ton matériel.</p>)}
    </Feuille>
  );
}

function Ajout({ dans, onChoisir, onFermer }: { dans: string[]; onChoisir: (p: PlanExo) => void; onFermer: () => void }) {
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const liste = useMemo(() => (muscle ? EXERCICES.filter((e) => e.cible === muscle && !dans.includes(e.id)) : []), [muscle, dans]);
  async function choisir(id: string) {
    // on demande au serveur la charge proposée et la dernière perf ; hors-ligne, on ajoute sans proposition
    try {
      return onChoisir(await api<PlanExo>(`/api/coach/plan?exo=${id}&dans=${dans.join(",")}`));
    } catch { /* hors-ligne */ }
    const e = EXERCICES_PAR_ID[id];
    onChoisir({ exerciceId: id, raison: "Ajouté par toi.", derniere: null, objectif: `Vise ${e.reps[0]}–${e.reps[1]}`, repos: 90, series: Array.from({ length: e.series }, () => ({ poids: null, reps: e.reps[0] })) });
  }
  return (
    <Feuille titre="Ajouter un exercice" onFermer={onFermer}>
      <div className="puces">
        {LISTE_MUSCLES.map((m) => (
          <button key={m} className={`puce ${muscle === m ? "active" : ""}`} onClick={() => setMuscle(m)}>{MUSCLES[m].nom}</button>
        ))}
      </div>
      {muscle && (
        <ul className="choix">
          {liste.map((e) => (
            <li key={e.id}>
              <button onClick={() => choisir(e.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/exos/${e.image}/0.jpg`} alt="" loading="lazy" />
                <span><strong>{e.nom}</strong><small>{NOM_MATERIEL[e.materiel]}</small></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Feuille>
  );
}

// ---------------------------------------------------------------- bilan

function Bilan({ fin }: { fin: Fin }) {
  return (
    <div className="bilan">
      <p className="surtitre">{fmtDate(new Date().toISOString())}</p>
      <h1>Séance terminée 💪</h1>
      <div className="chiffres">
        <div><strong>{fin.duree}</strong><small>minutes</small></div>
        <div><strong>{fin.series}</strong><small>séries</small></div>
        <div><strong>{fin.tonnage.toLocaleString("fr-FR")}</strong><small>kg soulevés</small></div>
      </div>
      {fin.progres.length > 0 && (
        <div className="carte">
          <h2 className="titre-section">Progrès depuis la dernière fois</h2>
          <ul className="progres">{fin.progres.map((p) => <li key={p.nom}><span>{p.nom}</span><strong>{p.texte}</strong></li>)}</ul>
        </div>
      )}
      <p className="discret">{fin.enregistre ? "Séance enregistrée." : "Pas de réseau : la séance est gardée sur ton téléphone et sera envoyée automatiquement."}</p>
      <Link href="/" className="bouton principal large">Retour à l&apos;accueil</Link>
    </div>
  );
}
