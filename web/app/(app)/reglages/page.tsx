"use client";
import { useEffect, useState } from "react";
import OngletsMoi from "@/components/OngletsMoi";
import { api } from "@/lib/client";
import { EQUIPEMENTS, LISTE_EQUIPEMENTS, PRESETS, type Equipement } from "@/lib/exercices";
import { GROUPES, MUSCLES, type Muscle } from "@/lib/muscles";
import type { Reglages } from "@/lib/reglages";

interface Moi {
  identifiant: string; nom: string; equipement: Equipement[]; reglages: Reglages;
}


export default function PageReglages() {
  const [moi, setMoi] = useState<Moi | null>(null);
  const [msg, setMsg] = useState("");
  const [mdp, setMdp] = useState({ ancien: "", nouveau: "" });
  const charger = () => api<Moi>("/api/compte").then(setMoi).catch(() => {});
  useEffect(() => { charger(); }, []);

  async function enregistrer(maj: { equipement?: Equipement[]; reglages?: Partial<Reglages> }, texte = "Enregistré.") {
    setMoi((x) => (x ? { ...x, ...(maj.equipement ? { equipement: maj.equipement } : {}), reglages: { ...x.reglages, ...(maj.reglages ?? {}) } } : x));
    try {
      await api("/api/compte", { method: "PATCH", json: maj });
      setMsg(texte);
    } catch (e) { setMsg((e as Error).message); }
  }
  const r = moi?.reglages;
  const basculer = (k: Equipement) => moi && enregistrer({ equipement: moi.equipement.includes(k) ? moi.equipement.filter((x) => x !== k) : [...moi.equipement, k] }, "Matériel enregistré : les prochaines séances en tiendront compte.");
  const memes = (a: Equipement[], b: Equipement[]) => a.length === b.length && a.every((x) => b.includes(x));
  const priorite = (m: Muscle) => {
    if (!r) return;
    const l = r.priorites.includes(m) ? r.priorites.filter((x) => x !== m) : r.priorites.length >= 3 ? r.priorites : [...r.priorites, m];
    if (l.length === r.priorites.length && !r.priorites.includes(m)) return setMsg("3 muscles prioritaires maximum.");
    enregistrer({ reglages: { priorites: l } }, "Priorités enregistrées.");
  };
  const lundi = () => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toISOString();
  };

  async function changerMdp(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/compte/mdp", { method: "POST", json: mdp });
      setMdp({ ancien: "", nouveau: "" });
      setMsg("Mot de passe modifié.");
    } catch (err) { setMsg((err as Error).message); }
  }
  async function deconnexion() {
    await api("/api/compte/deconnexion", { method: "POST" });
    location.href = "/connexion";
  }

  const Interrupteur = ({ k, titre, detail }: { k: "supersets" | "echauffement" | "rir" | "partage"; titre: string; detail: string }) => (
    <label className={`option-ligne ${r?.[k] ? "coche" : ""}`}>
      <span><strong>{titre}</strong><small>{detail}</small></span>
      <input type="checkbox" className="bascule" checked={!!r?.[k]} onChange={() => r && enregistrer({ reglages: { [k]: !r[k] } })} />
    </label>
  );

  return (
    <>
      <header className="entete"><p className="surtitre">{moi ? `@${moi.identifiant}` : ""}</p><h1>{moi?.nom ?? "Moi"}</h1></header>
      <OngletsMoi />
      {msg && <p className="info">{msg}</p>}

      <section className="carte">
        <h2 className="titre-section">Mon matériel</h2>
        <p className="discret" style={{ marginBottom: 10 }}>Coche ce que tu as : je ne proposerai que des exercices faisables avec. Les exercices au poids du corps (pompes, gainage…) sont toujours possibles.</p>
        <div className="puces" style={{ marginTop: 0, marginBottom: 12 }}>
          {PRESETS.map((p) => (
            <button key={p.nom} className={`puce ${moi && memes(moi.equipement, p.equipement) ? "active" : ""}`} onClick={() => enregistrer({ equipement: p.equipement }, "Matériel enregistré.")}>{p.nom}</button>
          ))}
        </div>
        <div className="options">
          {LISTE_EQUIPEMENTS.map((k) => (
            <label key={k} className={moi?.equipement.includes(k) ? "coche" : ""}>
              <input type="checkbox" checked={!!moi?.equipement.includes(k)} onChange={() => basculer(k)} />
              {EQUIPEMENTS[k]}
            </label>
          ))}
        </div>
      </section>

      <section className="carte">
        <h2 className="titre-section">Séances</h2>
        <div className="options">
          <Interrupteur k="supersets" titre="Supersets automatiques" detail="Enchaîne sans repos les isolations de muscles opposés (biceps/triceps, quadriceps/ischios…)." />
          <Interrupteur k="echauffement" titre="Échauffement" detail="Routine articulaire de 5 min + séries d'approche avant les mouvements lourds." />
          <Interrupteur k="rir" titre="Saisir les reps en réserve (RIR)" detail="Après chaque série : combien de reps tu aurais encore pu faire. Les charges proposées s'ajustent plus finement." />
          <label className="option-ligne">
            <span><strong>Objectif par semaine</strong><small>Pour ta série de semaines 🔥</small></span>
            <select value={r?.objectifSemaine ?? 3} onChange={(e) => enregistrer({ reglages: { objectifSemaine: Number(e.target.value) } })}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} séance{n > 1 ? "s" : ""}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="carte">
        <h2 className="titre-section">Cycle d&apos;entraînement</h2>
        <p className="discret" style={{ marginBottom: 10 }}>
          L&apos;effort monte semaine après semaine (3 → 0 reps en réserve, une série de plus en fin de cycle), puis une semaine de décharge plus légère pour récupérer et repartir plus fort. Le cycle recommence tout seul.
        </p>
        {r?.cycle ? (
          <>
            <p className="info">Cycle de {r.cycle.semaines} semaines commencé le {new Date(r.cycle.debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.</p>
            <div className="exo-actions" style={{ marginTop: 10 }}>
              <button onClick={() => enregistrer({ reglages: { cycle: { debut: lundi(), semaines: r.cycle!.semaines } } }, "Nouveau cycle à partir de cette semaine.")}>Recommencer cette semaine</button>
              <button className="danger" onClick={() => enregistrer({ reglages: { cycle: null } }, "Cycle arrêté.")}>Arrêter le cycle</button>
            </div>
          </>
        ) : (
          <div className="puces" style={{ marginTop: 0 }}>
            {[4, 5, 6].map((n) => (
              <button key={n} className="puce" onClick={() => enregistrer({ reglages: { cycle: { debut: lundi(), semaines: n } } }, `Cycle de ${n} semaines lancé (${n - 1} de progression + 1 de décharge).`)}>
                Lancer {n} semaines
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="carte">
        <h2 className="titre-section">Muscles prioritaires <small>{r?.priorites.length ?? 0}/3</small></h2>
        <p className="discret" style={{ marginBottom: 10 }}>Un exercice de plus quand ils sont au programme, un objectif de séries plus élevé, et les séances qui les ciblent remontent dans les propositions.</p>
        {GROUPES.map((g) => (
          <div key={g.nom} className="puces" style={{ marginTop: 6 }}>
            {g.muscles.map((m) => (
              <button key={m} className={`puce ${r?.priorites.includes(m) ? "active" : ""}`} onClick={() => priorite(m)}>{MUSCLES[m].nom}</button>
            ))}
          </div>
        ))}
      </section>

      <section className="carte">
        <h2 className="titre-section">Communauté</h2>
        <div className="options">
          <Interrupteur k="partage" titre="Partager mes séances" detail="Les personnes qui te suivent voient tes séances dans leur fil et le classement." />
        </div>
      </section>

      <section className="carte">
        <h2 className="titre-section">Mot de passe</h2>
        <form className="formulaire" onSubmit={changerMdp}>
          <label>Actuel<input type="password" value={mdp.ancien} onChange={(e) => setMdp({ ...mdp, ancien: e.target.value })} autoComplete="current-password" required /></label>
          <label>Nouveau<input type="password" value={mdp.nouveau} onChange={(e) => setMdp({ ...mdp, nouveau: e.target.value })} autoComplete="new-password" minLength={8} required /></label>
          <button className="bouton secondaire">Modifier</button>
        </form>
      </section>
      <section className="carte">
        <h2 className="titre-section">Installer l&apos;appli</h2>
        <p className="discret">Android (Chrome) : menu ⋮ → « Ajouter à l&apos;écran d&apos;accueil ». iPhone (Safari) : bouton Partager → « Sur l&apos;écran d&apos;accueil ». Ta séance en cours reste sur le téléphone, même sans réseau.</p>
      </section>
      <button className="bouton discret danger large" onClick={deconnexion}>Se déconnecter</button>
    </>
  );
}
