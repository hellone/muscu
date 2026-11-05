"use client";
import Link from "next/link";
import { fmtDate, ilYa } from "@/lib/client";

export interface CarteFil {
  id: string; auteur: { identifiant: string; nom: string; moi: boolean }; debut: string; fin: string | null;
  cible: string; nomCible: string; nbExos: number; nbSeries: number; tonnage: number; records: number;
  apercu: { nom: string; serie: string }[]; likes: number; jaime: boolean; commentaires: number;
}

export function Avatar({ nom }: { nom: string }) {
  const c = ["#c6f432", "#3ecf8e", "#4da3ff", "#ffb020", "#ff7ac8", "#b18cff"][[...nom].reduce((t, ch) => t + ch.charCodeAt(0), 0) % 6];
  return <span className="avatar" style={{ background: c }}>{nom.slice(0, 1).toUpperCase()}</span>;
}

export function CarteSeance({ c, onLike, lien = true }: { c: CarteFil; onLike: () => void; lien?: boolean }) {
  const duree = c.fin ? Math.round((Date.parse(c.fin) - Date.parse(c.debut)) / 60_000) : null;
  const corps = (
    <>
      <div className="fil-tete">
        <Avatar nom={c.auteur.nom} />
        <div><strong>{c.auteur.moi ? "Toi" : c.auteur.nom}</strong><small>@{c.auteur.identifiant} · {ilYa(c.debut)}</small></div>
      </div>
      <h3>{c.nomCible}</h3>
      <div className="fil-chiffres">
        {duree ? <span><b>{duree}</b> min</span> : null}
        <span><b>{c.nbSeries}</b> série{c.nbSeries > 1 ? "s" : ""}</span>
        {c.tonnage > 0 && <span><b>{c.tonnage.toLocaleString("fr-FR")}</b> kg</span>}
        {c.records > 0 && <span className="fil-records">🏆 <b>{c.records}</b> record{c.records > 1 ? "s" : ""}</span>}
      </div>
      <ul className="fil-apercu">{c.apercu.map((a) => <li key={a.nom}><span>{a.nom}</span><span>{a.serie}</span></li>)}</ul>
    </>
  );
  return (
    <article className="carte fil-carte">
      {lien ? <Link href={`/fil/${c.id}`}>{corps}</Link> : corps}
      <div className="fil-actions">
        <button className={c.jaime ? "jaime" : ""} onClick={onLike}>{c.jaime ? "💪" : "🤍"} {c.likes > 0 ? c.likes : ""} <span>Bravo</span></button>
        {lien && <Link href={`/fil/${c.id}`}>💬 {c.commentaires > 0 ? c.commentaires : ""} <span>Commenter</span></Link>}
        <small>{fmtDate(c.debut)}</small>
      </div>
    </article>
  );
}

