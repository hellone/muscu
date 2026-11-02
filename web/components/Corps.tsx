// Schéma du corps (face + dos) avec les muscles colorés.
// mode "exo" : principaux en couleur pleine, secondaires en clair.
// mode "recup" : rouge = fatigué, orange = en cours, vert = récupéré.
import type { Muscle } from "@/lib/muscles";

type Forme = { d?: string; e?: [number, number, number, number, number?] }; // e = ellipse cx, cy, rx, ry, rotation

/** Formes côté gauche du schéma (le côté droit est obtenu par symétrie autour de x = 60). */
const FACE: Partial<Record<Muscle, Forme[]>> = {
  trapezes: [{ d: "M53 37 C50 41 46 43 41 45 L52 45 Z" }],
  epaules_ant: [{ e: [40, 52, 6.5, 8, -15] }],
  epaules_lat: [{ d: "M33 47 C30 50 29 56 31 61 L35 58 C34 54 35 50 37 47 Z" }],
  pectoraux: [{ d: "M58.5 47 C51 45.5 44 47 41.5 54 C41 61 47 66.5 58.5 65 Z" }],
  biceps: [{ e: [34.5, 73, 4.6, 10.5, 8] }],
  avant_bras: [{ e: [30.5, 98, 4.2, 12, 9] }],
  abdos: [
    { d: "M52 69 h7 v9 h-7 Z" }, { d: "M52 80 h7 v9 h-7 Z" }, { d: "M52.5 91 h6.5 v10 h-6 Z" },
    { d: "M46 70 C44 80 45 92 48 104 L51 103 L51 70 Z" },
  ],
  quadriceps: [{ e: [50.5, 147, 8.2, 24, 3] }],
  adducteurs: [{ e: [57, 136, 2.6, 13, -4] }],
  mollets: [{ e: [47.5, 204, 4.2, 14, 2] }],
};

const DOS: Partial<Record<Muscle, Forme[]>> = {
  trapezes: [{ d: "M60 33 L60 76 L55 70 L50 50 L41 45 C48 43 54 39 57 33 Z" }],
  epaules_post: [{ e: [40, 52, 6.5, 8, 15] }],
  epaules_lat: [{ d: "M33 47 C30 50 29 56 31 61 L35 58 C34 54 35 50 37 47 Z" }],
  haut_dos: [{ d: "M50.5 52 L44 56 L45.5 66 L55 69 Z" }],
  dorsaux: [{ d: "M55.5 71 L45 67 C41 74 42 86 46 94 C50 98 54 100 58 101 Z" }],
  lombaires: [{ d: "M59 98 C55 98 52 100 51 103 L51 113 L59 113 Z" }],
  triceps: [{ e: [34.5, 72, 4.8, 11, 8] }],
  avant_bras: [{ e: [30.5, 98, 4.2, 12, 9] }],
  fessiers: [{ e: [52.5, 123, 7.8, 8.8] }],
  ischios: [{ e: [51, 155, 7.4, 21, 3] }],
  adducteurs: [{ e: [57.5, 140, 2.4, 11, -4] }],
  mollets: [{ e: [48, 199, 5.4, 14, 2] }],
};

function Silhouette() {
  return (
    <g className="corps-base">
      <circle cx="60" cy="18" r="11" />
      <path d="M54 27 h12 v9 h-12 Z" />
      <path d="M40 43 C47 38 54 36 60 36 C66 36 73 38 80 43 L84 52 L80 106 L77 118 L43 118 L40 106 L36 52 Z" />
      <path d="M38 48 L31 88" className="membre" strokeWidth="12" />
      <path d="M31 88 L28 113" className="membre" strokeWidth="9" />
      <circle cx="27.5" cy="118" r="4.5" />
      <path d="M82 48 L89 88" className="membre" strokeWidth="12" />
      <path d="M89 88 L92 113" className="membre" strokeWidth="9" />
      <circle cx="92.5" cy="118" r="4.5" />
      <path d="M51.5 117 L50 175" className="membre" strokeWidth="18" />
      <path d="M50 177 L48.5 226" className="membre" strokeWidth="11" />
      <path d="M68.5 117 L70 175" className="membre" strokeWidth="18" />
      <path d="M70 177 L71.5 226" className="membre" strokeWidth="11" />
      <path d="M44 229 h9 v4 h-11 Z M76 229 h-9 v4 h11 Z" />
    </g>
  );
}

function Formes({ formes, couleur, muscle }: { formes: Forme[]; couleur: (m: Muscle) => string | null; muscle: Muscle }) {
  const c = couleur(muscle);
  if (!c) return null;
  return (
    <g fill={c}>
      {formes.map((f, i) => {
        const el = f.d ? <path d={f.d} /> : <ellipse cx={f.e![0]} cy={f.e![1]} rx={f.e![2]} ry={f.e![3]} transform={f.e![4] ? `rotate(${f.e![4]} ${f.e![0]} ${f.e![1]})` : undefined} />;
        return (
          <g key={i}>
            {el}
            <g transform="translate(120 0) scale(-1 1)">{el}</g>
          </g>
        );
      })}
    </g>
  );
}

function Vue({ formes, couleur, titre }: { formes: Partial<Record<Muscle, Forme[]>>; couleur: (m: Muscle) => string | null; titre: string }) {
  return (
    <svg viewBox="16 2 88 236" className="corps-vue" role="img" aria-label={titre}>
      <Silhouette />
      {(Object.keys(formes) as Muscle[]).map((m) => <Formes key={m} muscle={m} formes={formes[m]!} couleur={couleur} />)}
    </svg>
  );
}

export function couleurRecup(pct: number | undefined, connu: boolean): string | null {
  if (pct === undefined || !connu) return "var(--muscle-neutre)";
  if (pct < 50) return "var(--fatigue-forte)";
  if (pct < 85) return "var(--fatigue-moyenne)";
  return "var(--recupere)";
}

export default function Corps({
  principaux = [], secondaires = [], recup, taille = "normal",
}: {
  principaux?: Muscle[];
  secondaires?: Muscle[];
  recup?: Partial<Record<Muscle, { pct: number; derniere: string | null }>>;
  taille?: "normal" | "petit";
}) {
  const couleur = (m: Muscle): string | null => {
    if (recup) return couleurRecup(recup[m]?.pct, !!recup[m]?.derniere);
    if (principaux.includes(m)) return "var(--accent)";
    if (secondaires.includes(m)) return "var(--accent-doux)";
    return "var(--muscle-neutre)";
  };
  return (
    <div className={`corps corps-${taille}`}>
      <div><Vue formes={FACE} couleur={couleur} titre="Face" /><span>Face</span></div>
      <div><Vue formes={DOS} couleur={couleur} titre="Dos" /><span>Dos</span></div>
    </div>
  );
}
