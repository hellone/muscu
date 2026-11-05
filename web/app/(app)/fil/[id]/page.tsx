"use client";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, fmtPoids, ilYa } from "@/lib/client";
import type { SeanceHisto } from "@/lib/coach";
import { EXERCICES_PAR_ID } from "@/lib/exercices";
import { Avatar, CarteSeance, type CarteFil } from "@/components/Social";

interface Detail {
  carte: CarteFil; seance: SeanceHisto; likesDe: string[];
  commentaires: { id: number; texte: string; cree_le: string; identifiant: string; nom: string; moi: boolean }[];
}

export default function DetailFil() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [erreur, setErreur] = useState("");
  const [texte, setTexte] = useState("");
  const charger = useCallback(() => api<Detail>(`/api/social/seances/${id}`).then(setD).catch((e) => setErreur(e.message)), [id]);
  useEffect(() => { charger(); }, [charger]);
  async function commenter(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim()) return;
    await api(`/api/social/seances/${id}/commentaires`, { method: "POST", json: { texte } }).catch((err) => setErreur(err.message));
    setTexte(""); charger();
  }
  return (
    <>
      <button className="retour" onClick={() => router.back()}>← Retour</button>
      {erreur && <p className="erreur">{erreur}</p>}
      {d && (
        <>
          <CarteSeance c={d.carte} lien={false} onLike={async () => { await api(`/api/social/seances/${id}/like`, { method: "POST", json: { jaime: !d.carte.jaime } }); charger(); }} />
          {d.likesDe.length > 0 && <p className="discret">💪 {d.likesDe.join(", ")}</p>}
          <section className="carte">
            <h2 className="titre-section">Détail</h2>
            {d.seance.exercices.map((e, i) => (
              <div key={i} className="fil-exo">
                <strong>{EXERCICES_PAR_ID[e.exerciceId]?.nom ?? e.exerciceId}{e.groupe ? <small> · superset</small> : null}</strong>
                <span>{e.series.map((x) => `${x.type === "echauffement" ? "É " : ""}${x.poids ? `${fmtPoids(x.poids)}×` : ""}${x.reps}`).join(" · ")}</span>
              </div>
            ))}
          </section>
          <section className="carte">
            <h2 className="titre-section">Commentaires</h2>
            <ul className="commentaires">
              {d.commentaires.map((c) => (
                <li key={c.id}>
                  <Avatar nom={c.nom} />
                  <div><strong>{c.nom}</strong> <small>{ilYa(c.cree_le)}</small><p>{c.texte}</p></div>
                  {(c.moi || d.carte.auteur.moi) && <button className="lien-discret danger" onClick={async () => { await api(`/api/social/commentaires/${c.id}`, { method: "DELETE" }); charger(); }}>Supprimer</button>}
                </li>
              ))}
            </ul>
            {d.commentaires.length === 0 && <p className="discret">Sois le premier à encourager !</p>}
            <form className="form-commentaire" onSubmit={commenter}>
              <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Écrire un commentaire…" maxLength={500} />
              <button className="bouton principal petit" disabled={!texte.trim()}>Envoyer</button>
            </form>
          </section>
        </>
      )}
    </>
  );
}
