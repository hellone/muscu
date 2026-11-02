"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PROFILS_MATERIEL, type ProfilMateriel } from "@/lib/exercices";

interface Moi { identifiant: string; nom: string; materiel: ProfilMateriel }

export default function Reglages() {
  const [moi, setMoi] = useState<Moi | null>(null);
  const [msg, setMsg] = useState("");
  const [mdp, setMdp] = useState({ ancien: "", nouveau: "" });
  useEffect(() => { api<Moi>("/api/compte").then(setMoi).catch(() => {}); }, []);

  async function materiel(m: ProfilMateriel) {
    await api("/api/compte", { method: "PATCH", json: { materiel: m } });
    setMoi((x) => (x ? { ...x, materiel: m } : x));
    setMsg("Matériel enregistré : les prochaines séances en tiendront compte.");
  }
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

  return (
    <>
      <header className="entete"><p className="surtitre">{moi ? `@${moi.identifiant}` : ""}</p><h1>{moi?.nom ?? "Compte"}</h1></header>
      {msg && <p className="info">{msg}</p>}
      <section className="carte">
        <h2 className="titre-section">Mon matériel</h2>
        <div className="options">
          {(Object.keys(PROFILS_MATERIEL) as ProfilMateriel[]).map((k) => (
            <label key={k} className={moi?.materiel === k ? "coche" : ""}>
              <input type="radio" name="materiel" checked={moi?.materiel === k} onChange={() => materiel(k)} />
              {PROFILS_MATERIEL[k].nom}
            </label>
          ))}
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
