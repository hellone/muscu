"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, fmtDate, nbEnvoisEnAttente } from "@/lib/client";

interface Resume { id: string; nomCible: string; debut: string; fin: string | null; nbExos: number; nbSeries: number; tonnage: number }

export default function Historique() {
  const [liste, setListe] = useState<Resume[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [attente, setAttente] = useState(0);
  useEffect(() => {
    setAttente(nbEnvoisEnAttente());
    api<Resume[]>("/api/seances").then(setListe).catch((e) => setErreur(e.message));
  }, []);
  const semaine = (liste ?? []).filter((s) => Date.now() - Date.parse(s.debut) < 7 * 86400_000);
  return (
    <>
      <header className="entete"><p className="surtitre">{semaine.length} séance{semaine.length > 1 ? "s" : ""} ces 7 derniers jours</p><h1>Historique</h1></header>
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
