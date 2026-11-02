"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, fmtDate, fmtPoids, lireSeance, modifierSeanceEnregistree } from "@/lib/client";
import type { SeanceHisto } from "@/lib/coach";
import { EXERCICES_PAR_ID } from "@/lib/exercices";
import { CIBLES, type CibleId } from "@/lib/muscles";

export default function DetailSeance() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [s, setS] = useState<SeanceHisto | null>(null);
  const [erreur, setErreur] = useState("");
  useEffect(() => { api<SeanceHisto>(`/api/seances/${id}`).then(setS).catch((e) => setErreur(e.message)); }, [id]);
  async function supprimer() {
    if (!confirm("Supprimer définitivement cette séance ?")) return;
    await api(`/api/seances/${id}`, { method: "DELETE" });
    router.push("/historique");
  }
  return (
    <>
      <button className="retour" onClick={() => router.back()}>← Retour</button>
      {erreur && <p className="erreur">{erreur}</p>}
      {s && (
        <>
          <header className="entete"><p className="surtitre majuscule">{fmtDate(s.debut)}</p><h1>{CIBLES[s.cible as CibleId]?.nom ?? "Séance"}</h1></header>
          {s.exercices.map((e, i) => {
            const ex = EXERCICES_PAR_ID[e.exerciceId];
            return (
              <section key={i} className="carte">
                <Link href={`/exercices/${e.exerciceId}`} className="titre-exo">{ex?.nom ?? e.exerciceId} →</Link>
                <ol className="series-faites">
                  {e.series.map((x, j) => <li key={j}>{x.poids !== null ? `${fmtPoids(x.poids)} kg × ` : ""}{x.reps}{ex?.unite === "sec" ? " s" : " reps"}</li>)}
                </ol>
              </section>
            );
          })}
          <button className="bouton secondaire large" onClick={() => {
            if (lireSeance() && !confirm("Une séance est déjà en cours sur ce téléphone. La remplacer ?")) return;
            modifierSeanceEnregistree(s, CIBLES[s.cible as CibleId]?.nom ?? "Séance libre");
            router.push("/seance");
          }}>Modifier (séries, exercices, date)</button>
          <button className="bouton discret danger large" onClick={supprimer}>Supprimer la séance</button>
        </>
      )}
    </>
  );
}
