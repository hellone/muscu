"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Feuille from "@/components/Feuille";
import { api, demarrerSeance, fmtDate, lireSeance, nbEnvoisEnAttente } from "@/lib/client";
import type { PlanExo } from "@/lib/coach";
import { LISTE_CIBLES } from "@/lib/muscles";

interface Resume { id: string; nomCible: string; debut: string; fin: string | null; nbExos: number; nbSeries: number; tonnage: number }

export default function Historique() {
  const [liste, setListe] = useState<Resume[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [attente, setAttente] = useState(0);
  const [saisie, setSaisie] = useState(false);
  useEffect(() => {
    setAttente(nbEnvoisEnAttente());
    api<Resume[]>("/api/seances").then(setListe).catch((e) => setErreur(e.message));
  }, []);
  const semaine = (liste ?? []).filter((s) => Date.now() - Date.parse(s.debut) < 7 * 86400_000);
  return (
    <>
      <header className="entete"><p className="surtitre">{semaine.length} séance{semaine.length > 1 ? "s" : ""} ces 7 derniers jours</p><h1>Historique</h1></header>
      <button className="bouton secondaire large" onClick={() => setSaisie(true)}>+ Saisir une séance passée</button>
      {saisie && <SaisiePassee onFermer={() => setSaisie(false)} />}
      {attente > 0 && <p className="info">{attente} séance(s) en attente d&apos;envoi (pas de réseau). Elles partiront automatiquement.</p>}
      {erreur && <p className="erreur">{erreur}</p>}
      {liste?.length === 0 && <p className="discret">Aucune séance pour l&apos;instant.</p>}
      <ul className="historique">
        {liste?.map((s) => {
          const duree = s.fin ? Math.round((Date.parse(s.fin) - Date.parse(s.debut)) / 60_000) : null;
          return (
            <li key={s.id}>
              <Link href={`/historique/${s.id}`}>
                <span className="date">{fmtDate(s.debut)}</span>
                <strong>{s.nomCible}</strong>
                <small>{s.nbExos} exercice{s.nbExos > 1 ? "s" : ""} · {s.nbSeries} série{s.nbSeries > 1 ? "s" : ""}{duree ? ` · ${duree} min` : ""}{s.tonnage ? ` · ${s.tonnage.toLocaleString("fr-FR")} kg` : ""}</small>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function SaisiePassee({ onFermer }: { onFermer: () => void }) {
  const router = useRouter();
  const hier = new Date(Date.now() - 86400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  const [jour, setJour] = useState(`${hier.getFullYear()}-${p(hier.getMonth() + 1)}-${p(hier.getDate())}`);
  const [heure, setHeure] = useState("18:00");
  const [cible, setCible] = useState("libre");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const aujourdhui = (() => { const d = new Date(); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; })();

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    const debut = new Date(`${jour}T${heure}`).toISOString();
    if (Date.parse(debut) > Date.now()) return setErreur("La date ne peut pas être dans le futur.");
    if (lireSeance() && !confirm("Une séance est déjà en cours sur ce téléphone. La remplacer ?")) return;
    setEnvoi(true); setErreur("");
    try {
      // le plan proposé tient compte de ce que tu avais fait AVANT cette date (charges, variété)
      const r = await api<{ plan: PlanExo[] }>("/api/coach/seance", { method: "POST", json: { cible, avant: debut } });
      demarrerSeance(cible, LISTE_CIBLES.find((c) => c.id === cible)?.nom ?? "Séance libre", r.plan, debut);
      router.push("/seance");
    } catch (err) {
      setErreur((err as Error).message);
      setEnvoi(false);
    }
  }

  return (
    <Feuille titre="Séance passée" onFermer={onFermer}>
      <form className="formulaire" onSubmit={valider}>
        <div className="ligne-champs">
          <label>Jour<input type="date" value={jour} max={aujourdhui} onChange={(e) => setJour(e.target.value)} required /></label>
          <label>Heure<input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} required /></label>
        </div>
        <label>Ce que tu as travaillé
          <select value={cible} onChange={(e) => setCible(e.target.value)}>
            <option value="libre">Je choisis mes exercices</option>
            {LISTE_CIBLES.map((c) => <option key={c.id} value={c.id}>{c.nom} (séance type pré-remplie)</option>)}
          </select>
        </label>
        <p className="discret">Tu saisis ensuite tes séries comme d&apos;habitude, puis « Terminer la séance ». La récupération et les charges proposées en tiendront compte.</p>
        {erreur && <p className="erreur">{erreur}</p>}
        <button className="bouton principal large" disabled={envoi}>{envoi ? "…" : "Saisir les séries"}</button>
      </form>
    </Feuille>
  );
}
