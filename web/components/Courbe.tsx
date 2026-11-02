// Petite courbe de progression en SVG (sans librairie).
export default function Courbe({ points, unite }: { points: { x: string; y: number }[]; unite: string }) {
  const W = 320, H = 140, P = { g: 34, d: 10, h: 12, b: 22 };
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 1) { min -= 1; max += 1; }
  const marge = (max - min) * 0.15;
  min = Math.max(0, min - marge); max += marge;
  const t0 = Date.parse(points[0].x), t1 = Date.parse(points[points.length - 1].x) || t0 + 1;
  const X = (x: string) => P.g + ((Date.parse(x) - t0) / Math.max(1, t1 - t0)) * (W - P.g - P.d);
  const Y = (y: number) => P.h + (1 - (y - min) / (max - min)) * (H - P.h - P.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(" ");
  const graduations = [min, (min + max) / 2, max];
  const fmt = (v: number) => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace(".", ",");
  const date = (x: string) => new Date(x).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return (
    <figure className="courbe">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Progression en ${unite}`}>
        {graduations.map((g) => (
          <g key={g}>
            <line x1={P.g} x2={W - P.d} y1={Y(g)} y2={Y(g)} className="grille" />
            <text x={P.g - 6} y={Y(g) + 3.5} textAnchor="end">{fmt(g)}</text>
          </g>
        ))}
        <path d={`${d} L${X(points[points.length - 1].x)} ${H - P.b} L${X(points[0].x)} ${H - P.b} Z`} className="aire" />
        <path d={d} className="ligne" />
        {points.map((p) => <circle key={p.x} cx={X(p.x)} cy={Y(p.y)} r="3" className="point" />)}
        <text x={P.g} y={H - 6}>{date(points[0].x)}</text>
        <text x={W - P.d} y={H - 6} textAnchor="end">{date(points[points.length - 1].x)}</text>
      </svg>
      <figcaption>{unite}</figcaption>
    </figure>
  );
}
