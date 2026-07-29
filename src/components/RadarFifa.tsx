"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

export interface RadarSerie {
  nom: string;
  color: string;
  valeurs: Record<string, number>;
  brutes?: Record<string, number>;
}

export interface RadarAxe {
  key: string;
  label: string;
}

// Étiquette d'axe multi-lignes (le label peut contenir des \n).
function TickAxe(props: any) {
  const { x, y, payload, cx, cy } = props;
  const lines = String(payload.value).split("\n");
  const dx = x - cx;
  const dy = y - cy;
  const anchor = Math.abs(dx) < 12 ? "middle" : dx > 0 ? "start" : "end";
  // Décale légèrement l'étiquette vers l'extérieur.
  const ox = x + Math.sign(dx) * 4;
  const oy = y + Math.sign(dy) * 2;
  return (
    <text
      x={ox}
      y={oy}
      textAnchor={anchor}
      fill="#B9C4CE"
      fontSize={11}
      fontWeight={700}
      letterSpacing={0.4}
    >
      {lines.map((l, i) => (
        <tspan key={i} x={ox} dy={i === 0 ? 0 : 12}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

export default function RadarFifa({
  series,
  axes,
  height = 460,
}: {
  series: RadarSerie[];
  axes: RadarAxe[];
  height?: number;
}) {
  const data = axes.map((axe) => {
    const row: Record<string, number | string> = { axis: axe.label };
    for (const s of series) row[s.nom] = s.valeurs[axe.key] ?? 0;
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="#3A4A5A" strokeOpacity={0.5} />
        <PolarAngleAxis dataKey="axis" tick={<TickAxe />} />
        {series.map((s, i) => (
          <Radar
            key={s.nom}
            name={s.nom}
            dataKey={s.nom}
            stroke={s.color}
            strokeWidth={i === 0 ? 3.5 : 2}
            fill={s.color}
            fillOpacity={i === 0 ? 0.28 : 0.06}
            isAnimationActive={false}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}
