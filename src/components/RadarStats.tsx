"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Player } from "@/types";

// Normalise une stat sur 100 par rapport à un plafond de référence.
const MAXES = {
  goals: 55,
  assists: 32,
  keyPasses: 130,
  dribblesCompleted: 145,
  rating: 9,
  passAccuracy: 95,
};

function toRadarData(players: Player[]) {
  const axes: { key: keyof typeof MAXES; label: string }[] = [
    { key: "goals", label: "Buts" },
    { key: "assists", label: "Passes déc." },
    { key: "keyPasses", label: "Passes clés" },
    { key: "dribblesCompleted", label: "Dribbles" },
    { key: "rating", label: "Note" },
    { key: "passAccuracy", label: "Précision" },
  ];
  return axes.map((axis) => {
    const row: Record<string, number | string> = { axis: axis.label };
    players.forEach((p) => {
      const val = p.stats[axis.key] as number;
      row[p.name] = Math.round((val / MAXES[axis.key]) * 100);
    });
    return row;
  });
}

const COLORS = ["#D4AF37", "#4F9DE0", "#E0685A", "#5AC98A"];

export default function RadarStats({ players }: { players: Player[] }) {
  const data = toRadarData(players);
  return (
    <ResponsiveContainer width="100%" height={360}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#ffffff20" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "#ffffff90", fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        {players.map((p, i) => (
          <Radar
            key={p.id}
            name={p.name}
            dataKey={p.name}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.25}
          />
        ))}
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
