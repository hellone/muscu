"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AnimExo from "@/components/AnimExo";
import Feuille from "@/components/Feuille";
import Minuteur from "@/components/Minuteur";
import Saisie from "@/components/Saisie";
import { api, ErreurApi, depuisChampDate, ecrireSeance, envoyerSeance, estPassee, fmtDate, fmtPoids, ilYa, lireSeance, useSeance, versChampDate, versEnvoi, type ExoLocal, type SeanceLocale } from "@/lib/client";
import type { PlanExo } from "@/lib/coach";
import { EXERCICES, EXERCICES_PAR_ID, NOM_MATERIEL, disponible, type Equipement } from "@/lib/exercices";
import { GROUPES, MUSCLES } from "@/lib/muscles";

type Fin = { enregistre: boolean; series: number; tonnage: number; duree: number | null; date: string; modif: boolean; progres: { nom: string; texte: string }[] };

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
    if (!deja && !seance!.passee) setRepos({ fin: Date.now() + exo.repos * 1000, total: exo.repos });
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
      setFin({ enregistre, series: series.length, tonnage: Math.round(series.reduce((t, x) => t + (x.poids ?? 0) * x.reps, 0)), duree: s.passee ? null : minutes, date: s.debut, modif: !!s.modif, progres });
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
      <div className="progression"><div style={{ width: `${total ? (faites / total) * 100 : 0}%` }} /></div>

      {seance.exos.length === 0 && <p className="info">Séance libre : ajoute tes exercices avec le bouton ci-dessous.</p>}
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

function CarteExo(p: {
  exo: ExoLocal; index: number; ouvert: boolean; passee: boolean; onToutValider: () => void;
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
            </div>
          )}
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
            {!fini && <button onClick={p.onToutValider} className="tout-valider">✓ Tout valider</button>}
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
