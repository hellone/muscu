"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Avatar, CarteSeance, type CarteFil } from "@/components/Social";

type Onglet = "fil" | "classement" | "amis";

export default function Communaute() {
  const [onglet, setOnglet] = useState<Onglet>("fil");
  return (
    <>
      <header className="entete"><p className="surtitre">Toi et les personnes que tu suis</p><h1>Communauté</h1></header>
      <div className="segments">
        {([["fil", "Fil"], ["classement", "Classement"], ["amis", "Amis"]] as [Onglet, string][]).map(([k, n]) => (
          <button key={k} className={onglet === k ? "actif" : ""} onClick={() => setOnglet(k)}>{n}</button>
        ))}
      </div>
      {onglet === "fil" && <Fil allerAmis={() => setOnglet("amis")} />}
      {onglet === "classement" && <Classement />}
      {onglet === "amis" && <Amis />}
    </>
  );
}

function Fil({ allerAmis }: { allerAmis: () => void }) {
  const [cartes, setCartes] = useState<CarteFil[] | null>(null);
  const [erreur, setErreur] = useState("");
  const charger = useCallback(() => api<CarteFil[]>("/api/social/fil").then(setCartes).catch((e) => setErreur(e.message)), []);
  useEffect(() => { charger(); }, [charger]);
  async function aimer(c: CarteFil) {
    setCartes((l) => l?.map((x) => (x.id === c.id ? { ...x, jaime: !x.jaime, likes: x.likes + (x.jaime ? -1 : 1) } : x)) ?? null);
    await api(`/api/social/seances/${c.id}/like`, { method: "POST", json: { jaime: !c.jaime } }).catch(charger);
  }
  if (erreur) return <p className="erreur">{erreur}</p>;
  if (!cartes) return <div className="carte squelette" style={{ height: 200 }} />;
  const seul = cartes.every((c) => c.auteur.moi);
  return (
    <>
      {seul && (
        <div className="info">Ton fil ne montre que tes séances. <button className="lien-discret" onClick={allerAmis}>Suis des amis</button> pour voir les leurs, les encourager et vous comparer.</div>
      )}
      {cartes.length === 0 && <p className="discret">Aucune séance pour l&apos;instant.</p>}
      {cartes.map((c) => <CarteSeance key={c.id} c={c} onLike={() => aimer(c)} />)}
    </>
  );
}

function Classement() {
  const [l, setL] = useState<{ identifiant: string; nom: string; moi: boolean; seances: number; series: number; tonnage: number }[] | null>(null);
  useEffect(() => { api<typeof l>("/api/social/classement").then(setL).catch(() => setL([])); }, []);
  if (!l) return <div className="carte squelette" style={{ height: 200 }} />;
  return (
    <section className="carte">
      <h2 className="titre-section">Cette semaine <small>depuis lundi</small></h2>
      <ol className="classement">
        {l.map((p, i) => (
          <li key={p.identifiant} className={p.moi ? "moi" : ""}>
            <span className="rang">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
            <Avatar nom={p.nom} />
            <span className="qui"><strong>{p.moi ? "Toi" : p.nom}</strong><small>{p.seances} séance{p.seances > 1 ? "s" : ""} · {p.series} séries</small></span>
            <b>{p.tonnage.toLocaleString("fr-FR")} kg</b>
          </li>
        ))}
      </ol>
      {l.length <= 1 && <p className="discret">Suis des amis pour comparer vos semaines.</p>}
    </section>
  );
}

function Amis() {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<{ identifiant: string; nom: string; suivi: boolean }[]>([]);
  const [amis, setAmis] = useState<{ jeSuis: { identifiant: string; nom: string }[]; meSuivent: { identifiant: string; nom: string; suivi: boolean }[] } | null>(null);
  const [msg, setMsg] = useState("");
  const charger = useCallback(() => api<typeof amis>("/api/social/amis").then(setAmis).catch(() => {}), []);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => {
    if (q.trim().length < 2) { setResultats([]); return; }
    const t = setTimeout(() => api<typeof resultats>(`/api/social/recherche?q=${encodeURIComponent(q.trim())}`).then(setResultats).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);
  async function suivre(identifiant: string, oui: boolean) {
    try {
      await api("/api/social/abonnements", { method: "POST", json: { identifiant, suivre: oui } });
      setResultats((l) => l.map((r) => (r.identifiant === identifiant ? { ...r, suivi: oui } : r)));
      setMsg(oui ? `Tu suis maintenant @${identifiant}.` : `Tu ne suis plus @${identifiant}.`);
      charger();
    } catch (e) { setMsg((e as Error).message); }
  }
  const Ligne = ({ p, suivi }: { p: { identifiant: string; nom: string }; suivi: boolean }) => (
    <li>
      <Avatar nom={p.nom} />
      <span className="qui"><strong>{p.nom}</strong><small>@{p.identifiant}</small></span>
      <button className={`bouton ${suivi ? "discret" : "secondaire"} petit`} onClick={() => suivre(p.identifiant, !suivi)}>{suivi ? "Ne plus suivre" : "Suivre"}</button>
    </li>
  );
  return (
    <>
      <input className="recherche" placeholder="Chercher par identifiant ou prénom…" value={q} onChange={(e) => setQ(e.target.value)} autoCapitalize="none" />
      {msg && <p className="info">{msg}</p>}
      {resultats.length > 0 && <ul className="personnes carte">{resultats.map((r) => <Ligne key={r.identifiant} p={r} suivi={r.suivi} />)}</ul>}
      {q.trim().length >= 2 && resultats.length === 0 && <p className="discret">Personne trouvé.</p>}
      {amis && (
        <>
          <section className="carte">
            <h2 className="titre-section">Je suis ({amis.jeSuis.length})</h2>
            {amis.jeSuis.length ? <ul className="personnes">{amis.jeSuis.map((p) => <Ligne key={p.identifiant} p={p} suivi />)}</ul> : <p className="discret">Personne pour l&apos;instant. Cherche l&apos;identifiant d&apos;un ami ci-dessus.</p>}
          </section>
          <section className="carte">
            <h2 className="titre-section">Me suivent ({amis.meSuivent.length})</h2>
            {amis.meSuivent.length ? <ul className="personnes">{amis.meSuivent.map((p) => <Ligne key={p.identifiant} p={p} suivi={p.suivi} />)}</ul> : <p className="discret">Personne ne te suit encore.</p>}
          </section>
        </>
      )}
      <p className="discret">Les personnes qui te suivent voient tes séances (tu peux le couper dans Moi → Réglages → Communauté).</p>
    </>
  );
}
