"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSeance } from "@/lib/client";

const ICONES: Record<string, React.ReactNode> = {
  accueil: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4Z" />,
  seance: <path d="M3 10h2v4H3zM19 10h2v4h-2zM6 7h2.5v10H6zM15.5 7H18v10h-2.5zM8.5 11h7v2h-7z" />,
  exos: <path d="M5 4h14v3H5zM5 10.5h14v3H5zM5 17h14v3H5z" />,
  fil: <path d="M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8.5 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1 19c0-3 3.1-5.5 7-5.5s7 2.5 7 5.5v1H1Zm15-5.4c3.6.1 7 1.9 7 4.9v1.5h-6V19c0-2-.4-3.8-1-5.4Z" />,
  compte: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8c0-3.3 3.6-6 8-6s8 2.7 8 6v1H4Z" />,
};

export default function TabBar() {
  const p = usePathname();
  const seance = useSeance();
  const onglets: { href: string; nom: string; icone: string; badge?: boolean; aussi?: string[] }[] = [
    { href: "/", nom: "Accueil", icone: "accueil" },
    { href: "/seance", nom: "Séance", icone: "seance", badge: !!seance },
    { href: "/exercices", nom: "Exercices", icone: "exos" },
    { href: "/fil", nom: "Communauté", icone: "fil" },
    { href: "/historique", nom: "Moi", icone: "compte", aussi: ["/reglages"] },
  ];
  return (
    <nav className="tabbar">
      {onglets.map((o) => {
        const actif = o.href === "/" ? p === "/" : p.startsWith(o.href) || !!o.aussi?.some((a) => p.startsWith(a));
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
