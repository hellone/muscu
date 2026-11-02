"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSeance } from "@/lib/client";

const ICONES: Record<string, React.ReactNode> = {
  accueil: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4Z" />,
  seance: <path d="M3 10h2v4H3zM19 10h2v4h-2zM6 7h2.5v10H6zM15.5 7H18v10h-2.5zM8.5 11h7v2h-7z" />,
  exos: <path d="M5 4h14v3H5zM5 10.5h14v3H5zM5 17h14v3H5z" />,
  historique: <path d="M12 4a8 8 0 1 1-7.4 5H7l-3.5-4L0 9h2.5A10 10 0 1 0 12 2zm-1 4h2v4.6l3.2 1.9-1 1.7L11 13.7Z" />,
  compte: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8c0-3.3 3.6-6 8-6s8 2.7 8 6v1H4Z" />,
};

export default function TabBar() {
  const p = usePathname();
  const seance = useSeance();
  const onglets = [
    { href: "/", nom: "Accueil", icone: "accueil" },
    { href: "/seance", nom: "Séance", icone: "seance", badge: !!seance },
    { href: "/exercices", nom: "Exercices", icone: "exos" },
    { href: "/historique", nom: "Historique", icone: "historique" },
    { href: "/reglages", nom: "Compte", icone: "compte" },
  ];
  return (
    <nav className="tabbar">
      {onglets.map((o) => {
        const actif = o.href === "/" ? p === "/" : p.startsWith(o.href);
        return (
          <Link key={o.href} href={o.href} className={actif ? "actif" : ""}>
            <svg viewBox="0 0 24 24" aria-hidden>{ICONES[o.icone]}</svg>
            <span>{o.nom}</span>
            {o.badge && <i className="pastille" />}
          </Link>
        );
      })}
    </nav>
  );
}
