"use client";
// Champ numérique avec boutons − / + (gros doigts, gants de salle).
export default function Saisie({
  valeur, onChange, pas, min = 0, unite, placeholder = "–",
}: { valeur: number | null; onChange: (v: number | null) => void; pas: number; min?: number; unite?: string; placeholder?: string }) {
  const ajuster = (d: number) => {
    const base = valeur ?? 0;
    const v = Math.max(min, Math.round((base + d) * 100) / 100);
    onChange(v);
  };
  return (
    <div className="saisie">
      <button type="button" onClick={() => ajuster(-pas)} aria-label="moins">−</button>
      <label>
        <input
          inputMode="decimal"
          value={valeur === null ? "" : String(valeur).replace(".", ",")}
          placeholder={placeholder}
          onChange={(e) => {
            const t = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
            if (t === "") return onChange(null);
            const v = Number(t);
            if (!Number.isNaN(v)) onChange(v);
          }}
          onFocus={(e) => e.target.select()}
        />
        {unite && <small>{unite}</small>}
      </label>
      <button type="button" onClick={() => ajuster(pas)} aria-label="plus">+</button>
    </div>
  );
}
