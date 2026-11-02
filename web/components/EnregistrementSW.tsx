"use client";
// Active le mode hors-ligne (service worker) et renvoie les séances en attente au retour du réseau.
import { useEffect } from "react";
import { synchroniser } from "@/lib/client";

export default function EnregistrementSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    synchroniser().catch(() => {});
    const enLigne = () => synchroniser().catch(() => {});
    window.addEventListener("online", enLigne);
    return () => window.removeEventListener("online", enLigne);
  }, []);
  return null;
}
