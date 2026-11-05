"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AnimExo from "@/components/AnimExo";
import Feuille from "@/components/Feuille";
import Minuteur from "@/components/Minuteur";
import Saisie from "@/components/Saisie";
import { api, ErreurApi, depuisChampDate, ecrireSeance, envoyerSeance, estPassee, fmtDate, fmtPoids, ilYa, lireSeance, useSeance, versChampDate, versEnvoi, type ExoLocal, type SeanceLocale } from "@/lib/client";
import { estTravail, valeurSerie, type PlanExo, type TypeSerie } from "@/lib/coach";
import { echauffementPour } from "@/lib/echauffement";
import { EXERCICES, EXERCICES_PAR_ID, NOM_MATERIEL, disponible, type Equipement } from "@/lib/exercices";
import { GROUPES, MUSCLES } from "@/lib/muscles";

type Fin = { enregistre: boolean; series: number; tonnage: number; duree: number | null; date: string; modif: boolean; progres: { nom: string; texte: string }[]; records: { nom: string; texte: string }[] };

const TYPES: { type: TypeSerie; lettre: string; nom: string }[] = [
  { type: "normale", lettre: "", nom: "Normale" },
  { type: "echauffement", lettre: "É", nom: "Échauffement" },
  { type: "degressive", lettre: "D", nom: "Dégressive" },
  { type: "echec", lettre: "F", nom: "Jusqu'à l'échec" },
];
const fmtSerie = (x: { poids: number | null; reps: number }) => (x.poids ? `${fmtPoids(x.poids)} kg × ${x.reps}` : `${x.reps} reps`);

/** Meilleure série validée de l'exercice dans la séance, si elle bat le record d'avant. */
function nouveauRecord(e: ExoLocal): number {
  if (!e.record && !e.derniere) return -1; // premier essai : pas de « record » affiché
  let best = -1, idx = -1;
  e.series.forEach((x, j) => {
    if (!x.fait || !estTravail(x) || x.reps <= 0) return;
    const v = valeurSerie(x);
    if (v > best) { best = v; idx = j; }
  });
  return idx >= 0 && best > (e.record?.unRM ?? 0) + 1e-9 ? idx : -1;
}

/** Comparaison avec la même série la dernière fois (séries de travail, dans l'ordre). */
function comparaison(e: ExoLocal, j: number): "mieux" | "moins" | "" {
  const x = e.series[j];
  if (!x.fait || !estTravail(x) || !e.derniere) return "";
  const rang = e.series.slice(0, j + 1).filter(estTravail).length - 1;
  const avant = e.derniere.series[rang];
  if (!avant) return "";
  const a = valeurSerie(avant), b = valeurSerie(x);
  return b > a + 1e-9 ? "mieux" : b < a - 1e-9 ? "moins" : "";
}

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
  const [choixDate, setChoixDate] = useState(false);
  const [erreur, setErreur] = useState("");
  const [toast, setToast] = useState("");
  const [, tic] = useState(0);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); }, [toast]);
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

  /** Indices des exercices du même superset que i (dans l'ordre), ou [i]. */
  const membres = (s: SeanceLocale, i: number) => {
    const g = s.exos[i]?.groupe;
    if (!g) return [i];
    return s.exos.map((x, k) => (x.groupe === g ? k : -1)).filter((k) => k >= 0);
  };

  function validerSerie(i: number, j: number) {
    const exo = seance!.exos[i];
    const deja = exo.series[j].fait;
    let reposApres: number | null = null;
    modifier((s) => {
      const e = s.exos[i];
      e.series[j].fait = !deja;
      if (deja) return;
      // la série suivante reprend la charge saisie si elle n'en avait pas
      const suiv = e.series[j + 1];
      if (suiv && !suiv.fait && suiv.poids === null && suiv.type !== "echauffement") suiv.poids = e.series[j].poids;
      const grp = membres(s, i);
      if (grp.length > 1) {
        // superset : on passe à l'exercice suivant du groupe sans repos ; repos seulement après le dernier
        const pos = grp.indexOf(i);
        const suivant = grp.slice(pos + 1).find((k) => s.exos[k].series.some((y) => !y.fait));
        if (suivant !== undefined) { s.actif = suivant; return; }
        reposApres = Math.max(...grp.map((k) => s.exos[k].repos));
        const premier = grp.find((k) => s.exos[k].series.some((y) => !y.fait));
        if (premier !== undefined) { s.actif = premier; return; }
      } else {
        reposApres = e.series[j].type === "echauffement" ? 45 : e.repos;
      }
      if (grp.every((k) => s.exos[k].series.every((x) => x.fait))) {
        const prochain = s.exos.findIndex((x, k) => k > Math.max(...grp) && x.series.some((y) => !y.fait));
        if (prochain >= 0) s.actif = prochain;
      }
    });
    if (!deja) {
      const apres = lireSeance()?.exos[i];
      if (apres && nouveauRecord(apres) === j) setToast(`🏆 Nouveau record : ${fmtSerie(apres.series[j])}`);
      if (reposApres && !seance!.passee) setRepos({ fin: Date.now() + reposApres * 1000, total: reposApres });
    }
  }

  function lierAuSuivant(i: number) {
    modifier((s) => {
      const a = s.exos[i], b = s.exos[i + 1];
      if (!b) return;
      if (a.groupe && a.groupe === b.groupe) { // délier
        const g = a.groupe;
        const reste = s.exos.filter((x) => x.groupe === g);
        if (reste.length <= 2) reste.forEach((x) => { x.groupe = null; }); else b.groupe = null;
        return;
      }
      const g = a.groupe ?? b.groupe ?? Math.max(0, ...s.exos.map((x) => x.groupe ?? 0)) + 1;
      a.groupe = g; b.groupe = g;
    });
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
      const series = envoiData.exercices.flatMap((e) => e.series).filter(estTravail);
      const records = s.exos.flatMap((e) => {
        const j = nouveauRecord(e);
        return j >= 0 ? [{ nom: EXERCICES_PAR_ID[e.exerciceId]?.nom ?? e.exerciceId, texte: fmtSerie(e.series[j]) }] : [];
      });
      const progres = s.exos.flatMap((e) => {
        const ex = EXERCICES_PAR_ID[e.exerciceId];
        const faitesE = e.series.filter((x) => x.fait && estTravail(x));
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
      setFin({ enregistre, series: series.length, tonnage: Math.round(series.reduce((t, x) => t + (x.poids ?? 0) * x.reps, 0)), duree: s.passee ? null : minutes, date: s.debut, modif: !!s.modif, progres, records });
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
          <p className="surtitre">{seance.passee ? fmtDate(seance.debut) : `${minutes} min`} · {faites}/{total} séries</p>
          <h1>{seance.nomCible}</h1>
        </div>
        <button className="bouton discret" onClick={() => confirm(seance.modif ? "Annuler la modification ? La séance enregistrée ne change pas." : "Abandonner cette séance ? Rien ne sera enregistré.") && ecrireSeance(null)}>{seance.modif ? "Annuler" : "Abandonner"}</button>
      </header>
      <button className="date-seance" onClick={() => setChoixDate(true)}>
        📅 {seance.passee ? "Séance du" : "Commencée le"} {new Date(seance.debut).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} <span>Changer</span>
      </button>
      {seance.options?.cycle && (
        <p className={`badge-cycle ${seance.options.cycle.decharge ? "decharge" : ""}`}>
          {seance.options.cycle.decharge ? "🧘 Semaine de décharge" : `📈 Semaine ${seance.options.cycle.semaine}/${seance.options.cycle.total} du cycle`} · objectif : {seance.options.cycle.rirCible} rep{seance.options.cycle.rirCible > 1 ? "s" : ""} en réserve
        </p>
      )}
      <div className="progression"><div style={{ width: `${total ? (faites / total) * 100 : 0}%` }} /></div>
      {seance.options?.echauffement && !seance.passee && faites === 0 && seance.exos.length > 0 && <Echauffement ids={seance.exos.map((x) => x.exerciceId)} />}

      {seance.exos.length === 0 && <p className="info">Séance libre : ajoute tes exercices avec le bouton ci-dessous.</p>}
      <ol className="exos">
        {seance.exos.map((e, i) => (
          <CarteExo
            key={`${e.exerciceId}-${i}`}
            exo={e}
            index={i}
            superset={e.groupe ? (seance.exos[i - 1]?.groupe === e.groupe ? (seance.exos[i + 1]?.groupe === e.groupe ? "milieu" : "fin") : (seance.exos[i + 1]?.groupe === e.groupe ? "debut" : null)) : null}
            lie={!!e.groupe && seance.exos[i + 1]?.groupe === e.groupe}
            onLier={i < seance.exos.length - 1 ? () => lierAuSuivant(i) : undefined}
            rir={!!seance.options?.rir}
            onType={(j) => modifier((s) => {
              const x = s.exos[i].series[j];
              const k = TYPES.findIndex((t) => t.type === (x.type ?? "normale"));
              x.type = TYPES[(k + 1) % TYPES.length].type;
            })}
            onRir={(j, v) => modifier((s) => { s.exos[i].series[j].rir = v; })}
            ouvert={seance.actif === i}
            onOuvrir={() => modifier((s) => { s.actif = s.actif === i ? -1 : i; })}
            onValider={(j) => validerSerie(i, j)}
            onSerie={(j, champ, v) => modifier((s) => { (s.exos[i].series[j] as any)[champ] = champ === "reps" ? Math.round(v ?? 0) : v; })}
            passee={!!seance.passee}
            onToutValider={() => modifier((s) => { s.exos[i].series.forEach((x) => { if (x.reps > 0) x.fait = true; }); const p = s.exos.findIndex((x, k) => k > i && x.series.some((y) => !y.fait)); s.actif = p; })}
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
      {toast && <div className="toast">{toast}</div>}
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
      {choixDate && (
        <Feuille titre="Date de la séance" onFermer={() => setChoixDate(false)}>
          <form className="formulaire" onSubmit={(e) => {
            e.preventDefault();
            const v = (new FormData(e.currentTarget).get("date") as string) || "";
            if (!v) return;
            const iso = depuisChampDate(v);
            if (Date.parse(iso) > Date.now() + 3600_000) return alert("La date ne peut pas être dans le futur.");
            modifier((s) => { s.debut = iso; s.passee = s.modif || estPassee(iso); });
            setChoixDate(false);
          }}>
            <label>Jour et heure<input type="datetime-local" name="date" defaultValue={versChampDate(seance.debut)} max={versChampDate(new Date().toISOString())} required /></label>
            <p className="discret">Pratique si tu as oublié de saisir une séance : choisis le jour où tu l&apos;as faite.</p>
            <button className="bouton principal large">Valider</button>
          </form>
        </Feuille>
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

function Echauffement({ ids }: { ids: string[] }) {
  const liste = useMemo(() => echauffementPour(ids), [ids]);
  const [ouvert, setOuvert] = useState(true);
  const [faits, setFaits] = useState<number[]>([]);
  return (
    <section className="echauffement">
      <button className="echauffement-tete" onClick={() => setOuvert(!ouvert)}>
        <span>🔥 Échauffement articulaire · 5 min</span><small>{faits.length}/{liste.length} {ouvert ? "▴" : "▾"}</small>
      </button>
      {ouvert && (
        <ul>
          {liste.map((m, k) => (
            <li key={m.nom}>
              <label className={faits.includes(k) ? "fait" : ""}>
                <input type="checkbox" checked={faits.includes(k)} onChange={() => setFaits(faits.includes(k) ? faits.filter((x) => x !== k) : [...faits, k])} />
                <span>{m.nom}</span><small>{m.duree}</small>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CarteExo(p: {
  exo: ExoLocal; index: number; ouvert: boolean; passee: boolean; onToutValider: () => void;
  superset: "debut" | "milieu" | "fin" | null; lie: boolean; onLier?: () => void;
  rir: boolean; onType: (j: number) => void; onRir: (j: number, v: number | null) => void;
  onOuvrir: () => void; onValider: (j: number) => void; onSerie: (j: number, champ: "poids" | "reps", v: number | null) => void;
  onAjouterSerie: () => void; onRetirerSerie: () => void; onRemplacer: () => void; onRetirer: () => void; onMonter?: () => void;
}) {
  const ex = EXERCICES_PAR_ID[p.exo.exerciceId];
  if (!ex) return null;
  const faites = p.exo.series.filter((s) => s.fait).length;
  const fini = faites === p.exo.series.length;
  const sec = ex.unite === "sec";
  const lest = ex.increment === 0;
  const record = nouveauRecord(p.exo);
  return (
    <li className={`exo ${p.ouvert ? "ouvert" : ""} ${fini ? "fini" : ""} ${p.superset ? `ss ss-${p.superset}` : ""}`}>
      {(p.superset === "debut") && <span className="ss-etiquette">Superset · enchaîne sans repos</span>}
      <button className="exo-tete" onClick={p.onOuvrir}>
        <span className="exo-num">{fini ? "✓" : p.index + 1}</span>
        <span className="exo-titre">
          <strong>{ex.nom}{record >= 0 && <span className="trophee" title="Nouveau record"> 🏆</span>}</strong>
          <small>{faites}/{p.exo.series.length} séries · {ex.reps[0]}–{ex.reps[1]}{sec ? " s" : " reps"} · {MUSCLES[ex.cible].nom}</small>
        </span>
        <span className="chevron">{p.ouvert ? "▴" : "▾"}</span>
      </button>
      {p.ouvert && (
        <div className="exo-corps">
          <div className="exo-visuel">
            <AnimExo exo={ex} petit />
            <div>
              {p.exo.raison && <p className="pourquoi">{p.exo.raison}</p>}
              <Link href={`/exercices/${ex.id}`} className="lien-discret">Comment le faire · muscles →</Link>
            </div>
          </div>
          {(p.exo.derniere || p.exo.objectif) && (
            <div className="historique-exo">
              {p.exo.derniere ? (
                <p><span>Dernière fois ({ilYa(p.exo.derniere.date)}) :</span> {p.exo.derniere.series.map((s) => (s.poids !== null ? `${fmtPoids(s.poids)}×${s.reps}` : `${s.reps}`)).join(" · ")}</p>
              ) : <p><span>Nouvel exercice</span></p>}
              {p.exo.objectif && <p className="objectif">🎯 {p.exo.objectif}</p>}
              {p.exo.record && <p><span>Record :</span> {fmtSerie(p.exo.record)}</p>}
            </div>
          )}
          <table className="series">
            <thead><tr><th>#</th><th>{lest ? "Lest (kg)" : "Charge (kg)"}</th><th>{sec ? "Secondes" : "Reps"}</th><th /></tr></thead>
            <tbody>
              {p.exo.series.map((s, j) => {
                const t = TYPES.find((x) => x.type === (s.type ?? "normale"))!;
                const comp = comparaison(p.exo, j);
                const numero = p.exo.series.slice(0, j + 1).filter((x) => estTravail(x)).length;
                return [
                <tr key={j} className={`${s.fait ? "faite" : ""} ${comp} ${s.type ?? ""}`}>
                  <td><button className={`type-serie ${s.type ?? "normale"}`} onClick={() => p.onType(j)} title={`${t.nom} (toucher pour changer)`}>{t.lettre || numero}{record === j && <i>🏆</i>}</button></td>
                  <td><Saisie valeur={s.poids} onChange={(v) => p.onSerie(j, "poids", v)} pas={ex.increment || 2.5} placeholder={lest ? "0" : "kg"} /></td>
                  <td><Saisie valeur={s.reps} onChange={(v) => p.onSerie(j, "reps", v)} pas={sec ? 5 : 1} /></td>
                  <td><button className={`valider ${s.fait ? "ok" : ""}`} onClick={() => p.onValider(j)} aria-label="Valider la série">✓</button></td>
                </tr>,
                p.rir && s.fait && estTravail(s) ? (
                  <tr key={`${j}-rir`} className="ligne-rir">
                    <td />
                    <td colSpan={3}>
                      <div className="choix-rir">
                        <span>En réserve</span>
                        {[0, 1, 2, 3, 4].map((v) => (
                          <button key={v} className={s.rir === v ? "actif" : ""} onClick={() => p.onRir(j, s.rir === v ? null : v)}>{v === 4 ? "4+" : v}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : null,
                ];
              })}
            </tbody>
          </table>
          <p className="legende-series">Touche le numéro : <b>É</b> échauffement · <b>D</b> dégressive · <b>F</b> jusqu&apos;à l&apos;échec{p.exo.derniere ? " · vert/rouge = mieux/moins bien que la dernière fois" : ""}</p>
          <div className="exo-actions">
            {!fini && <button onClick={p.onToutValider} className="tout-valider">✓ Tout valider</button>}
            <button onClick={p.onAjouterSerie}>+ Série</button>
            <button onClick={p.onRetirerSerie}>− Série</button>
            <button onClick={p.onRemplacer}>Remplacer</button>
            {p.onMonter && <button onClick={p.onMonter}>Monter</button>}
            {p.onLier && <button onClick={p.onLier}>{p.lie ? "Délier du suivant" : "Superset avec le suivant"}</button>}
            <button onClick={p.onRetirer} className="danger">Retirer</button>
          </div>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- remplacer / ajouter

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
  const [groupe, setGroupe] = useState<string | null>(null);
  const [equipement, setEquipement] = useState<Equipement[] | null>(null);
  const [tout, setTout] = useState(false);
  useEffect(() => { api<{ equipement: Equipement[] }>("/api/compte").then((u) => setEquipement(u.equipement)).catch(() => {}); }, []);
  const liste = useMemo(
    () => {
      const g = GROUPES.find((x) => x.nom === groupe);
      return g ? EXERCICES.filter((e) => g.muscles.includes(e.cible) && !dans.includes(e.id) && (tout || !equipement || disponible(e, equipement)))
        .sort((a, b) => g.muscles.indexOf(a.cible) - g.muscles.indexOf(b.cible) || a.niveau - b.niveau) : [];
    },
    [groupe, dans, tout, equipement],
  );
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
        {GROUPES.map((g) => (
          <button key={g.nom} className={`puce ${groupe === g.nom ? "active" : ""}`} onClick={() => setGroupe(g.nom)}>{g.nom}</button>
        ))}
      </div>
      {groupe && equipement && (
        <button className="lien-discret" style={{ marginTop: 10 }} onClick={() => setTout(!tout)}>{tout ? "Seulement avec mon matériel" : "Voir aussi les exercices sans mon matériel"}</button>
      )}
      {groupe && liste.length === 0 && <p className="discret" style={{ marginTop: 10 }}>Aucun exercice avec ton matériel pour ce groupe.</p>}
      {groupe && (
        <ul className="choix">
          {liste.map((e) => (
            <li key={e.id}>
              <button onClick={() => choisir(e.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/exos/${e.image}/0.jpg`} alt="" loading="lazy" />
                <span><strong>{e.nom}</strong><small>{MUSCLES[e.cible].nom} · {NOM_MATERIEL[e.materiel]}</small></span>
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
      <p className="surtitre">{fmtDate(fin.date)}</p>
      <h1>{fin.modif ? "Séance modifiée ✅" : fin.duree === null ? "Séance ajoutée ✅" : "Séance terminée 💪"}</h1>
      <div className="chiffres">
        {fin.duree !== null && <div><strong>{fin.duree}</strong><small>minutes</small></div>}
        <div><strong>{fin.series}</strong><small>séries</small></div>
        <div><strong>{fin.tonnage.toLocaleString("fr-FR")}</strong><small>kg soulevés</small></div>
      </div>
      {fin.records.length > 0 && (
        <div className="carte records">
          <h2 className="titre-section">🏆 Nouveaux records</h2>
          <ul className="progres">{fin.records.map((p) => <li key={p.nom}><span>{p.nom}</span><strong>{p.texte}</strong></li>)}</ul>
        </div>
      )}
      {fin.progres.length > 0 && (
        <div className="carte">
          <h2 className="titre-section">Progrès depuis la dernière fois</h2>
          <ul className="progres">{fin.progres.map((p) => <li key={p.nom}><span>{p.nom}</span><strong>{p.texte}</strong></li>)}</ul>
        </div>
      )}
      <p className="discret">{fin.enregistre ? "Séance enregistrée." : "Pas de réseau : la séance est gardée sur ton téléphone et sera envoyée automatiquement."}</p>
      <Link href={fin.duree === null ? "/historique" : "/"} className="bouton principal large">{fin.duree === null ? "Voir l'historique" : "Retour à l'accueil"}</Link>
    </div>
  );
}
