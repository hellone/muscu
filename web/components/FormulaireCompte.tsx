"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export default function FormulaireCompte({ mode, codeRequis = false }: { mode: "connexion" | "inscription"; codeRequis?: boolean }) {
  const [champs, setChamps] = useState({ identifiant: "", nom: "", mdp: "", code: "" });
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const maj = (k: keyof typeof champs) => (e: React.ChangeEvent<HTMLInputElement>) => setChamps({ ...champs, [k]: e.target.value });

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(""); setEnvoi(true);
    try {
      await api(`/api/compte/${mode}`, { method: "POST", json: champs });
      location.href = "/";
    } catch (err) {
      setErreur((err as Error).message);
      setEnvoi(false);
    }
  }

  return (
    <form className="carte formulaire" onSubmit={valider}>
      <h1>{mode === "connexion" ? "Connexion" : "Créer un compte"}</h1>
      {mode === "inscription" && (
        <label>Prénom<input value={champs.nom} onChange={maj("nom")} autoComplete="given-name" required /></label>
      )}
      <label>Identifiant<input value={champs.identifiant} onChange={maj("identifiant")} autoComplete="username" autoCapitalize="none" required /></label>
      <label>Mot de passe<input type="password" value={champs.mdp} onChange={maj("mdp")} autoComplete={mode === "connexion" ? "current-password" : "new-password"} minLength={mode === "inscription" ? 8 : undefined} required /></label>
      {mode === "inscription" && codeRequis && (
        <label>Code d&apos;invitation<input value={champs.code} onChange={maj("code")} required /></label>
      )}
      {erreur && <p className="erreur">{erreur}</p>}
      <button className="bouton principal" disabled={envoi}>{envoi ? "…" : mode === "connexion" ? "Se connecter" : "C'est parti"}</button>
    </form>
  );
}
