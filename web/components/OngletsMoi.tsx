"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Bascule Historique / Réglages dans l'onglet « Moi ». */
export default function OngletsMoi() {
  const p = usePathname();
  return (
    <div className="segments">
      <Link href="/historique" className={p.startsWith("/historique") ? "actif" : ""}>Historique</Link>
      <Link href="/reglages" className={p.startsWith("/reglages") ? "actif" : ""}>Réglages</Link>
    </div>
  );
}
