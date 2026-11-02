"use client";
// Schéma du corps : rendus 3D (face / dos) avec les muscles colorés par-dessus.
// Les couleurs sont fusionnées en « produit » avec le rendu : le relief de la sculpture reste visible.
// mode exercice : principaux en couleur pleine, secondaires en clair.
// mode récupération : rouge = fatigué, orange = en cours, vert = récupéré, rien = jamais travaillé.
import { useId, useState } from "react";
import type { Muscle } from "@/lib/muscles";

type Forme = { d?: string; e?: number[] }; // e = ellipse [cx, cy, rx, ry, rotation]
type Vue = "face" | "dos";

/** Zones dessinées sur la moitié gauche de l'image ; l'autre moitié est obtenue par symétrie autour de `axe`. */
const VUES: Record<Vue, { w: number; h: number; axe: number; zones: Partial<Record<Muscle, Forme[]>> }> = {
  face: {
    w: 803, h: 879, axe: 399,
    zones: {
      trapezes: [{ d: "M384 110 C373 127 356 136 332 143 L362 149 C374 141 383 132 386 122 Z" }],
      epaules_ant: [{ e: [302, 182, 17, 32, 15] }],
      epaules_lat: [{ e: [281, 168, 14, 25, 32] }],
      pectoraux: [{ d: "M397 150 C370 145 332 150 312 175 C303 200 311 228 336 238 C361 245 385 240 397 232 Z" }],
      biceps: [{ e: [246, 205, 40, 15, -31] }],
      avant_bras: [{ e: [146, 252, 50, 13, -18] }],
      abdos: [{ d: "M373 238 L399 236 L399 342 L369 340 Z" }, { d: "M352 242 C336 262 331 300 341 334 L363 338 L361 246 Z" }],
      quadriceps: [{ e: [348, 490, 42, 104, 3] }],
      adducteurs: [{ e: [385, 462, 11, 44, -8] }],
      mollets: [{ e: [326, 680, 20, 48, 4] }],
    },
  },
  dos: {
    w: 766, h: 871, axe: 383,
    zones: {
      trapezes: [{ d: "M383 92 L361 100 L311 140 L346 175 L371 255 L383 275 Z" }],
      epaules_post: [{ e: [291, 176, 22, 28, -20] }],
      epaules_lat: [{ e: [268, 165, 14, 25, 30] }],
      haut_dos: [{ d: "M372 182 L345 172 C325 180 313 200 318 225 L362 240 Z" }],
      dorsaux: [{ d: "M373 247 L318 230 C296 246 292 280 305 300 C325 320 350 330 376 336 Z" }],
      lombaires: [{ d: "M366 298 L383 296 L383 372 L360 369 C362 345 363 320 366 298 Z" }],
      triceps: [{ e: [236, 205, 38, 15, -33] }],
      avant_bras: [{ e: [146, 248, 50, 13, -20] }],
      fessiers: [{ e: [342, 425, 42, 45, 0] }],
      ischios: [{ e: [338, 545, 35, 75, 3] }],
      adducteurs: [{ e: [370, 505, 9, 35, 0] }],
      mollets: [{ e: [318, 680, 32, 60, 0] }],
    },
  },
};

/** Muscles qu'on ne voit (presque) que de dos : la vue de dos est choisie d'office pour eux. */
const DE_DOS: Muscle[] = ["trapezes", "epaules_post", "haut_dos", "dorsaux", "lombaires", "triceps", "fessiers", "ischios"];

function Dessin({ f }: { f: Forme }) {
  if (f.d) return <path d={f.d} />;
  const [cx, cy, rx, ry, rot = 0] = f.e!;
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} />;
}

function Figure({ vue, couleur, id }: { vue: Vue; couleur: (m: Muscle) => string | null; id: string }) {
  const v = VUES[vue];
  const src = `/corps/${vue}.webp`;
  const zones = (Object.keys(v.zones) as Muscle[]).map((m) => ({ m, c: couleur(m) })).filter((z) => z.c);
  return (
    <svg viewBox={`0 0 ${v.w} ${v.h}`} className="corps-vue" role="img" aria-label={vue === "face" ? "Vue de face" : "Vue de dos"}>
      <defs>
        <mask id={`${id}-m`} style={{ maskType: "alpha" }}>
          <image href={src} width={v.w} height={v.h} />
        </mask>
        <filter id={`${id}-f`}><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <image href={src} width={v.w} height={v.h} />
      <g mask={`url(#${id}-m)`} style={{ mixBlendMode: "multiply" }}>
        <g filter={`url(#${id}-f)`} opacity={0.9}>
          {zones.map(({ m, c }) => (
            <g key={m} fill={c!.slice(0, 7)} fillOpacity={c!.length > 7 ? 0.5 : 1}>
              {v.zones[m]!.map((f, i) => <Dessin key={i} f={f} />)}
              <g transform={`translate(${2 * v.axe} 0) scale(-1 1)`}>
                {v.zones[m]!.map((f, i) => <Dessin key={i} f={f} />)}
              </g>
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}

export function couleurRecup(pct: number | undefined, connu: boolean): string | null {
  if (pct === undefined || !connu) return null;
  if (pct < 50) return "#ff5a4e";
  if (pct < 85) return "#ffb020";
  return "#3ecf8e";
}

export default function Corps({
  principaux = [], secondaires = [], recup, taille = "normal",
}: {
  principaux?: Muscle[];
  secondaires?: Muscle[];
  recup?: Partial<Record<Muscle, { pct: number; derniere: string | null }>>;
  taille?: "normal" | "petit";
}) {
  const id = useId().replace(/:/g, "");
  const couleur = (m: Muscle): string | null => {
    if (recup) return couleurRecup(recup[m]?.pct, !!recup[m]?.derniere);
    if (principaux.includes(m)) return "#c6f432";
    if (secondaires.includes(m)) return "#c6f43266";
    return null;
  };
  // vue par défaut : celle où se trouve le muscle principal de l'exercice
  const parDefaut: Vue = !recup && principaux.length && DE_DOS.includes(principaux[0]) ? "dos" : "face";
  const [vue, setVue] = useState<Vue>(parDefaut);
  // pastille sur l'onglet de l'autre vue quand des muscles y sont colorés (fatigués en mode récupération)
  const compte = (v: Vue) =>
    (Object.keys(VUES[v].zones) as Muscle[]).filter((m) => (recup ? recup[m]?.derniere && recup[m]!.pct < 85 : principaux.includes(m))).length;
  return (
    <div className={`corps corps-${taille}`}>
      <div className="corps-onglets" role="tablist">
        {(["face", "dos"] as Vue[]).map((v) => (
          <button key={v} role="tab" aria-selected={vue === v} className={vue === v ? "actif" : ""} onClick={() => setVue(v)}>
            {v === "face" ? "Face" : "Dos"}{vue !== v && compte(v) > 0 && <i />}
          </button>
        ))}
      </div>
      <Figure vue={vue} couleur={couleur} id={`${id}-${vue}`} />
    </div>
  );
}
